// Originally forked from https://github.com/bazelbuild/rules_nodejs/tree/0.41.0/packages/inject-html

const parse5 = require("parse5");
const treeAdapter = require("parse5/lib/tree-adapters/default");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");

const NPM_NAME = "html-insert-assets";

const EXTERNAL_RE = /^[a-z]+:\/\//;
const FILE_TYPE_RE = /\.([a-z]+)$/i;
const EXTERNAL_FILE_TYPE_RE = /^[a-z]+:\/\/.*\.([a-z]+)(\?.*)?$/i;
const NOW = String(Date.now());

function fileExtToType(ext) {
  return ext === "mjs" ? "js" : ext;
}

function computeAssets(assets) {
  return assets.reduce((map, a) => {
    const r = a.match(EXTERNAL_FILE_TYPE_RE) || a.match(FILE_TYPE_RE);
    const [, ext] = r || ["", "(no ext)"];
    const type = fileExtToType(ext.toLowerCase());

    (map[type] || (map[type] = [])).push(a);

    return map;
  }, {});
}

function findElementByName(d, name) {
  if (treeAdapter.isTextNode(d)) return undefined;
  if (d.tagName && d.tagName.toLowerCase() === name) {
    return d;
  }
  if (!treeAdapter.getChildNodes(d)) {
    return undefined;
  }
  for (let i = 0; i < treeAdapter.getChildNodes(d).length; i++) {
    const f = treeAdapter.getChildNodes(d)[i];
    const result = findElementByName(f, name);
    if (result) return result;
  }
  return undefined;
}

function normalizePath(p) {
  p = path.normalize(p);
  // Convert paths to posix
  p = p.replace(/\\/g, "/");
  if (p[0] !== "/" && p[0] !== ".") {
    p = `./${p}`;
  }
  return p;
}

function normalizeDirPath(d) {
  d = normalizePath(d);
  if (!d.endsWith("/")) {
    d = d + "/";
  }
  return d;
}

function removeExternal(p) {
  if (p.startsWith("./external/")) {
    p = normalizePath(p.substring("./external/".length));
  }
  return p;
}

function readVarArgs(params, i) {
  const args = [];
  while (i < params.length && !params[i].startsWith("--")) {
    args.push(params[i++]);
  }
  return [args, i - 1];
}

function readOptionalParam(params, i, defaultValue) {
  if (i < params.length && !params[i].startsWith("--")) {
    return [params[i], i];
  }

  return [defaultValue, i - 1];
}

function createScriptElement(src, moduleName) {
  const attrs = [];
  if (moduleName) {
    attrs.push({ name: "type", value: "module" });
  } else if (moduleName === false) {
    attrs.push({ name: "nomodule", value: "" });
  }

  attrs.push({ name: "src", value: src });

  return treeAdapter.createElement("script", undefined, attrs);
}

// https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content#What_types_of_content_can_be_preloaded
const PRELOAD_TYPES = Object.freeze({
  js: "script",
  mjs: "script",
  css: "style",
  ico: "image",
  jpg: "image",
  png: "image",
  gif: "image",
});
function insertPreloads({ treeAdapter, head, toUrl }, paths, preloadAs) {
  for (const p of paths) {
    const link = treeAdapter.createElement("link", undefined, [
      { name: "rel", value: "preload" },
      { name: "href", value: toUrl(p) },
      { name: "as", value: preloadAs },
    ]);
    treeAdapter.appendChild(head, link);
  }
}

function parseArgs(cmdParams) {
  let inputFile;
  let outputFile;
  let assetsList = [];
  let preloadAssetsList = [];
  let rootDirs = [];
  let verbose = false;
  let strict = false;
  let stampType = "hash=8";

  const params = cmdParams.reduce((a, p) => {
    if (p.startsWith("--") && p.match(/^--[a-z]+=/)) {
      a.push(...p.split("=", 2));
    } else {
      a.push(p);
    }
    return a;
  }, []);

  for (let i = 0; i < params.length; i++) {
    switch (params[i]) {
      case "--assets":
        [assetsList, i] = readVarArgs(params, i + 1);
        break;

      case "--preload":
        [preloadAssetsList, i] = readVarArgs(params, i + 1);
        break;

      case "--strict":
        strict = true;
        break;

      case "--roots":
        [rootDirs, i] = readVarArgs(params, i + 1);
        break;

      case "--out":
        outputFile = params[++i];
        break;

      case "--html":
        inputFile = params[++i];
        break;

      case "--stamp":
        [stampType, i] = readOptionalParam(params, i + 1, stampType);
        break;

      case "--verbose":
        verbose = true;
        break;

      default:
        throw newError(`Unknown arg: ${params[i]}`);
    }
  }

  if (!inputFile || !outputFile) {
    throw newError("required: --html, --out");
  }

  const assets = computeAssets(assetsList);
  const preloadAssets = computeAssets(preloadAssetsList);

  // Normalize fs paths, assets done separately later
  rootDirs = rootDirs.map(normalizeDirPath);
  inputFile = inputFile && normalizePath(inputFile);
  outputFile = outputFile && normalizePath(outputFile);

  // Always trim the longest root first
  rootDirs.sort((a, b) => b.length - a.length);

  return {
    inputFile,
    outputFile,
    assets,
    preloadAssets,
    rootDirs,
    stampType,
    strict,
    verbose,
  };
}

function insertScripts({ treeAdapter, body, toUrl }, paths) {
  // Other filenames we assume are for non-ESModule browsers, so if the file has a matching
  // ESModule script we add a 'nomodule' attribute
  function hasMatchingModule(file) {
    const noExt = file.substring(0, file.length - 3);
    const testMjs = (noExt + ".mjs").toLowerCase();
    const testEs2015 = (noExt + ".es2015.js").toLowerCase();
    const matches = paths.filter((t) => {
      const lc = t.toLowerCase();
      return lc === testMjs || lc === testEs2015;
    });
    return matches.length > 0;
  }

  for (const s of paths) {
    if (EXTERNAL_RE.test(s)) {
      treeAdapter.appendChild(body, createScriptElement(toUrl(s), undefined));
    } else if (/\.(es2015\.|m)js$/i.test(s)) {
      // Differential loading: for filenames like
      //  foo.mjs
      //  bar.es2015.js
      //
      // Use a <script type="module"> tag so these are only run in browsers that have
      // ES2015 module loading.
      treeAdapter.appendChild(body, createScriptElement(toUrl(s), true));
    } else {
      // Note: empty string value is equivalent to a bare attribute, according to
      // https://github.com/inikulin/parse5/issues/1
      const nomoduleAttr = hasMatchingModule(s) ? false : undefined;

      treeAdapter.appendChild(
        body,
        createScriptElement(toUrl(s), nomoduleAttr)
      );
    }
  }
}

function insertCss({ treeAdapter, head, toUrl }, paths) {
  for (const css of paths) {
    const stylesheet = treeAdapter.createElement("link", undefined, [
      { name: "rel", value: "stylesheet" },
      { name: "href", value: toUrl(css) },
    ]);
    treeAdapter.appendChild(head, stylesheet);
  }
}

function insertFavicons({ treeAdapter, head, toUrl }, paths) {
  for (const ico of paths) {
    const icoLink = treeAdapter.createElement("link", undefined, [
      { name: "rel", value: "shortcut icon" },
      { name: "type", value: "image/ico" },
      { name: "href", value: toUrl(ico) },
    ]);
    treeAdapter.appendChild(head, icoLink);
  }
}

function createLogger(verbose) {
  if (!verbose) {
    return () => {};
  }

  return function logger(str, ...args) {
    console.log(`${NPM_NAME}: ${str}`, ...args);
  };
}

function warn(str, ...args) {
  console.warn(`${NPM_NAME}: ${str}`, ...args);
}

function newError(str, ...args) {
  return new Error(`${NPM_NAME}: ${str} ${args.join(" ")}`.trim());
}

function fileLastModified(file) {
  if (fs.existsSync(file)) {
    return String(fs.statSync(file).mtime.getTime());
  }

  console.warn(
    `html-insert-assets: filed to find ${file} to stamp. Will fallback to timestamp.`
  );

  return NOW;
}

function hashFile(file) {
  if (fs.existsSync(file)) {
    const data = fs.readFileSync(file);
    return crypto
      .createHash("sha1")
      .update(data)
      .digest("base64")
      .replace(/[^a-z0-9]/gi, "");
  }

  console.warn(
    `html-insert-assets: filed to find ${file} to stamp. Will fallback to timestamp.`
  );

  return NOW;
}

function createStamper(typeParam) {
  const [type, value] = typeParam.split("=");

  switch (type) {
    case "none":
      return () => "";

    case "const":
      return () => value;

    case "now":
      return () => NOW.slice(-value);

    case "lastmod":
      return (f) => fileLastModified(f).slice(-value);

    case "hash":
      return (f) => hashFile(f).slice(-value);

    default:
      throw new Error(`Invalid stamp type: ${typeParam}`);
  }
}

function mkdirpWrite(filePath, value) {
  mkdirp.sync(path.dirname(filePath));
  fs.writeFileSync(filePath, value);
}

function main(params, write = mkdirpWrite) {
  const {
    inputFile,
    outputFile,
    assets,
    preloadAssets,
    rootDirs,
    stampType,
    strict,
    verbose,
  } = parseArgs(params);
  const log = createLogger(verbose);
  const stamper = createStamper(stampType);

  // Log the parsed params
  log("in: %s", inputFile);
  log("out: %s", outputFile);
  log("roots: %s", rootDirs);
  Object.entries(assets).forEach(([type, typeAssets]) =>
    log("files (%s): %s", type, typeAssets)
  );
  Object.entries(preloadAssets).forEach(([type, typeAssets]) =>
    log("preload files (%s): %s", type, typeAssets)
  );

  const document = parse5.parse(
    fs.readFileSync(inputFile, { encoding: "utf-8" }),
    { treeAdapter }
  );

  const body = findElementByName(document, "body");
  if (!body) {
    throw newError("No <body> tag found in HTML document");
  }

  const head = findElementByName(document, "head");
  if (!head) {
    throw newError("No <head> tag found in HTML document");
  }

  function removeRootPath(p) {
    for (const r of rootDirs) {
      if (p.startsWith(r)) {
        return p.substring(r.length);
      }
    }
    return p;
  }

  const outputDir = normalizeDirPath(path.dirname(outputFile));
  const rootedOutputDir = removeRootPath(outputDir).replace(/^\//, "./");
  function relativeToHtml(p) {
    // Ignore absolute
    if (path.isAbsolute(p)) {
      return p;
    }

    return path.relative(rootedOutputDir, p);
  }

  /**
   * Converts an inputed path to a URL based on:
   * - root paths
   * - output file path (urls are relative to this)
   * - /external/ prefix
   * - standard path normalization
   *
   * Leaves external URLs as-is.
   *
   * @param {string} origPath the path to convert to a normalized URL
   * @return {string} the normalized URL
   */
  function toUrl(origPath) {
    let execPath = origPath;

    if (EXTERNAL_RE.test(origPath)) {
      return origPath;
    }

    // Calculate the stamp on the origina fs-path
    const stamp = stamper(origPath);

    execPath = normalizePath(execPath);
    execPath = removeExternal(execPath);
    execPath = removeRootPath(execPath);
    execPath = relativeToHtml(execPath);
    execPath = normalizePath(execPath);
    execPath = stamp ? `${execPath}?v=${stamp}` : execPath;

    if (execPath !== origPath) {
      log("reduce: %s => %s", origPath, execPath);
    }

    return execPath;
  }

  const utils = { treeAdapter, toUrl, body, head };

  // Insertion of various asset preload types
  for (const [type, prePaths] of Object.entries(preloadAssets)) {
    const preloadAs = PRELOAD_TYPES[type];
    if (preloadAs) {
      insertPreloads(utils, prePaths, preloadAs);
    } else if (strict) {
      throw new Error(`Unknown preload type(${type}), paths(${prePaths})`);
    }
  }

  // Insertion of various asset types
  for (const [type, paths] of Object.entries(assets)) {
    switch (type) {
      case "js":
        insertScripts(utils, paths);
        break;

      case "css":
        insertCss(utils, paths);
        break;

      case "ico":
        insertFavicons(utils, paths);
        break;

      default:
        // eslint-disable-next-line no-case-declarations
        const msg = `Unknown asset type(${type}), paths(${paths})`;
        if (strict) {
          throw newError(msg);
        } else {
          warn(msg);
        }
    }
  }

  const content = parse5.serialize(document, { treeAdapter });
  write(outputFile, content, { encoding: "utf-8" });
  return 0;
}

module.exports = {
  parseArgs,
  main,

  // For testing
  __NOW: NOW,
};
