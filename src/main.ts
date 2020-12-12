// Originally forked from https://github.com/bazelbuild/rules_nodejs/tree/0.41.0/packages/inject-html
"use strict";

import { Node, TreeAdapter } from "parse5";
import parse5 = require("parse5");
const treeAdapter = require("parse5/lib/tree-adapters/default") as TreeAdapter;

import crypto = require("crypto");
import fs = require("fs");
import path = require("path");
import mkdirp = require("mkdirp");

const NPM_NAME = "html-insert-assets";

const EXTERNAL_RE = /^[a-z]+:\/\//;
const FILE_TYPE_RE = /\.([a-z]+)$/i;
const EXTERNAL_FILE_TYPE_RE = /^[a-z]+:\/\/.*\.([a-z]+)(\?.*)?$/i;
const ES2015_RE = /\.(es2015\.|m)js$/i;
const NOW = String(Date.now());

interface DOMUtils {
  body: Node;
  head: Node;
}

export const enum AssetType {
  JS,
  MJS,
  CSS,
  FAVICON,
  IMAGE,
  UNKNOWN,
}

export type Attributes = { readonly [name: string]: string };

export interface Asset {
  readonly type: AssetType;
  readonly uri: string;
  readonly attributes: Attributes;
}

export interface JsAsset extends Asset {
  readonly type: AssetType.JS | AssetType.MJS;
  readonly module?: boolean;
}

function isJsAsset(asset: Asset): asset is JsAsset {
  return asset.type === AssetType.JS || asset.type === AssetType.MJS;
}

function filenameToExtension(uri: string) {
  const [, ext] = uri.match(EXTERNAL_FILE_TYPE_RE) ||
    uri.match(FILE_TYPE_RE) || [undefined, undefined];

  return ext?.toLowerCase();
}

function filenameToImageMimeType(uri: string) {
  const ext = filenameToExtension(uri) ?? "ico";

  switch (ext) {
    case "svg":
      return "image/svg+xml";

    default:
      return `image/${ext}`;
  }
}

function guessTypeFromFileExt(ext: string) {
  switch (ext) {
    case "js":
      return AssetType.JS;
    case "mjs":
      return AssetType.MJS;
    case "css":
      return AssetType.CSS;
    case "ico":
      return AssetType.FAVICON;
    case "png":
    case "jpg":
    case "gif":
      return AssetType.IMAGE;
    default:
      return AssetType.UNKNOWN;
  }
}

function guessAttributes(uri: string, type: AssetType): Attributes {
  switch (type) {
    case AssetType.FAVICON:
      return {
        rel: "shortcut icon",
        type: filenameToImageMimeType(uri),
      };

    default:
      return {};
  }
}

function guessPathToAsset(uri: string): Asset {
  const ext = filenameToExtension(uri) ?? "";
  const type = guessTypeFromFileExt(ext);
  const attributes = guessAttributes(uri, type);

  return {
    type,
    uri,
    attributes,
  };
}

function findElementByName(d: Node, name: string): Node | undefined {
  if ("nodeName" in d && d.nodeName.toLowerCase() === name) {
    return d;
  }

  for (const f of treeAdapter.getChildNodes(d) || []) {
    const result = findElementByName(f, name);
    if (result) return result;
  }

  return undefined;
}

function normalizePath(p: string) {
  p = path.normalize(p);
  // Convert paths to posix
  p = p.replace(/\\/g, "/");
  if (p[0] !== "/" && p[0] !== ".") {
    p = `./${p}`;
  }
  return p;
}

function normalizeDirPath(d: string) {
  d = normalizePath(d);
  if (!d.endsWith("/")) {
    d = `${d}/`;
  }
  return d;
}

function removeExternal(p: string) {
  if (p.startsWith("./external/")) {
    p = normalizePath(p.slice("./external/".length));
  }
  return p;
}

function readVarArgs(params: string[], i: number): [string[], number] {
  const args = [];
  while (i < params.length && !params[i].startsWith("--")) {
    args.push(params[i++]);
  }
  return [args, i - 1];
}

function readOptionalParam(
  params: string[],
  i: number,
  defaultValue: string
): [string, number] {
  if (i < params.length && !params[i].startsWith("--")) {
    return [params[i], i];
  }

  return [defaultValue, i - 1];
}

function readScriptArgs(scriptAssets: JsAsset[], params: string[], i: number) {
  const attributes: { [attr: string]: string } = {};

  let allModules: boolean | undefined = undefined;

  while (i < params.length && params[i].startsWith("--")) {
    const param = params[i++];

    switch (param) {
      case "--async":
        attributes["async"] = "";
        break;

      case "--module":
      case "--nomodule":
        if (allModules !== undefined) {
          throw newError("Both --module and --nomodule specified");
        }

        allModules = param === "--module";
        break;

      case "--attr":
        do {
          // eslint-disable-next-line no-case-declarations
          const [key, value] = params[i++].split("=", 2);
          attributes[key] = value || "";
        } while (!params[i].startsWith("--") && params[i].includes("="));

        break;

      default:
        throw newError(`Unknown --scripts arg: ${param}`);
    }
  }

  const uris: string[] = [];

  do {
    uris.push(params[i]);
  } while (++i < params.length && !params[i].startsWith("--"));

  uris.forEach(uri => {
    let type: AssetType;
    let module = allModules;

    // If specified via --[no]module then used that
    if (module !== undefined) {
      type = module ? AssetType.MJS : AssetType.JS;
    }
    // Otherwise determine it based on filename
    else if (ES2015_RE.test(uri)) {
      type = AssetType.MJS;
      module = true;
    } else {
      type = AssetType.JS;
      module = hasMatchingModule(uri, uris) ? false : undefined;
    }

    scriptAssets.push({
      type,
      uri,
      module,
      attributes,
    });
  });

  return i - 1;
}

function readFaviconArgs(favicons: Asset[], params: string[], i: number) {
  const attributes: { [k: string]: string } = {};

  while (i < params.length && params[i].startsWith("--")) {
    const param = params[i++];

    switch (param) {
      case "--rel":
      case "--sizes":
      case "--type":
        attributes[param.slice(2)] = params[i++];
        break;

      default:
        throw newError(`Unknown --favicons arg: ${param}`);
    }
  }

  do {
    const uri = params[i];

    favicons.push({
      type: AssetType.FAVICON,
      uri,
      attributes: {
        rel: "icon",
        type: filenameToImageMimeType(uri),
        ...attributes,
      },
    });
  } while (i < params.length && !params[++i].startsWith("--"));

  return i - 1;
}

function readStylesheetArgs(stylesheets: Asset[], params: string[], i: number) {
  const attributes: { [k: string]: string } = {};

  while (i < params.length && params[i].startsWith("--")) {
    const param = params[i++];

    switch (param) {
      case "--media":
        attributes[param.slice(2)] = params[i++];
        break;

      default:
        throw newError(`Unknown --stylesheets arg: ${param}`);
    }
  }

  do {
    const uri = params[i];

    stylesheets.push({
      type: AssetType.CSS,
      uri,
      attributes,
    });
  } while (i < params.length && !params[++i].startsWith("--"));

  return i - 1;
}

// https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content#What_types_of_content_can_be_preloaded
const PRELOAD_TYPES = Object.freeze<Partial<{ [type in AssetType]: string }>>({
  [AssetType.JS]: "script",
  [AssetType.MJS]: "script",
  [AssetType.CSS]: "style",
  [AssetType.FAVICON]: "image",
  [AssetType.IMAGE]: "image",
});

function insertPreload({ head }: DOMUtils, uri: string, preloadAs: string) {
  const link = treeAdapter.createElement("link", "", [
    { name: "rel", value: "preload" },
    { name: "href", value: uri },
    { name: "as", value: preloadAs },
  ]);
  treeAdapter.appendChild(head, link);
}

function parseArgs(cmdParams: string[]) {
  let inputFile = "";
  let outputFile = "";
  const scriptAssets: JsAsset[] = [];
  const faviconAssets: Asset[] = [];
  const stylesheetAssets: Asset[] = [];
  let assetPaths: string[] = [];
  let preloadAssetPaths: string[] = [];
  let rootDirs: string[] = [];
  let verbose = false;
  let strict = false;
  let stampType = "hash=8";

  const params = cmdParams.reduce<string[]>((a, p) => {
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
        [assetPaths, i] = readVarArgs(params, i + 1);
        break;

      case "--scripts":
        i = readScriptArgs(scriptAssets, params, i + 1);
        break;

      case "--favicons":
        i = readFaviconArgs(faviconAssets, params, i + 1);
        break;

      case "--stylesheets":
        i = readStylesheetArgs(stylesheetAssets, params, i + 1);
        break;

      case "--preload":
        [preloadAssetPaths, i] = readVarArgs(params, i + 1);
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

  // Normalize fs paths, assets done separately later
  rootDirs = rootDirs.map(normalizeDirPath);
  inputFile = inputFile && normalizePath(inputFile);
  outputFile = outputFile && normalizePath(outputFile);

  // Always trim the longest root first
  rootDirs.sort((a, b) => b.length - a.length);

  return {
    inputFile,
    outputFile,
    scriptAssets,
    faviconAssets,
    stylesheetAssets,
    assetPaths,
    preloadAssetPaths,
    rootDirs,
    stampType,
    strict,
    verbose,
  };
}

function hasMatchingModule(uri: string, all: string[]) {
  const noExt = uri.slice(0, uri.lastIndexOf("."));
  const testMjs = `${noExt}.mjs`.toLowerCase();
  const testEs2015 = `${noExt}.es2015.js`.toLowerCase();
  return all.some(t => {
    const lc = t.toLowerCase();
    return lc === testMjs || lc === testEs2015;
  });
}

function guessES2015Modules(asset: Asset, all: string[]): Asset | JsAsset {
  if (!isJsAsset(asset) || EXTERNAL_RE.test(asset.uri)) {
    return asset;
  }

  const { type, uri } = asset;

  // Differential loading: for filenames like
  //  foo.mjs
  //  bar.es2015.js
  //
  // Use a <script type="module"> tag so these are only run in browsers that have
  // ES2015 module loading.
  if (
    AssetType.MJS === type ||
    (AssetType.JS === type && ES2015_RE.test(uri))
  ) {
    return { ...asset, module: true };
  }

  // Other filenames we assume are for non-ESModule browsers, so if the file has a matching
  // ESModule script we add a 'nomodule' attribute
  if (type === AssetType.JS && hasMatchingModule(uri, all)) {
    return { ...asset, module: false };
  }

  return asset;
}

function attributesToParse5(attributes: Attributes): parse5.Attribute[] {
  return Object.keys(attributes).map(key => ({
    name: key,
    value: attributes[key],
  }));
}

function insertScript({ body }: DOMUtils, url: string, asset: JsAsset) {
  const attrs: parse5.Attribute[] = [];
  if (asset.module === true) {
    attrs.push({ name: "type", value: "module" });
  } else if (asset.module === false) {
    // Note: empty string value is equivalent to a bare attribute, according to
    // https://github.com/inikulin/parse5/issues/1
    attrs.push({ name: "nomodule", value: "" });
  }

  attrs.push({ name: "src", value: url });

  attrs.push(...attributesToParse5(asset.attributes));

  const script = treeAdapter.createElement("script", "", attrs);

  treeAdapter.appendChild(body, script);
}

function insertCss({ head }: DOMUtils, url: string, attributes: Attributes) {
  const stylesheet = treeAdapter.createElement("link", "", [
    { name: "rel", value: "stylesheet" },
    { name: "href", value: url },
    ...attributesToParse5(attributes),
  ]);
  treeAdapter.appendChild(head, stylesheet);
}

function insertFavicon(
  { head }: DOMUtils,
  url: string,
  attributes: Attributes
) {
  const icoLink = treeAdapter.createElement("link", "", [
    ...attributesToParse5(attributes),
    { name: "href", value: url },
  ]);
  treeAdapter.appendChild(head, icoLink);
}

function createLogger(verbose: boolean) {
  if (!verbose) {
    return () => {
      /* noop */
    };
  }

  return function logger(str: string, ...args: unknown[]) {
    console.log(`${NPM_NAME}: ${str}`, ...args);
  };
}

function warn(str: string, ...args: unknown[]) {
  console.warn(`${NPM_NAME}: ${str}`, ...args);
}

function newError(str: string, ...args: unknown[]) {
  return new Error(`${NPM_NAME}: ${str} ${args.join(" ")}`.trim());
}

function fileLastModified(file: string) {
  if (fs.existsSync(file)) {
    return String(fs.statSync(file).mtime.getTime());
  }

  console.warn(
    `html-insert-assets: failed to find ${file} to stamp. Will fallback to timestamp.`
  );

  return NOW;
}

function hashFile(file: string) {
  if (fs.existsSync(file)) {
    const data = fs.readFileSync(file);
    return crypto
      .createHash("sha1")
      .update(data)
      .digest("base64")
      .replace(/[^a-z0-9]/gi, "");
  }

  console.warn(
    `html-insert-assets: failed to find ${file} to stamp. Will fallback to timestamp.`
  );

  return NOW;
}

function createStamper(typeParam: string): (f: string) => string {
  const [type, value] = typeParam.split("=");

  switch (type) {
    case "none":
      return () => "";

    case "const":
      return () => value;

    case "now":
      return () => NOW.slice(-value);

    case "lastmod":
      return f => fileLastModified(f).slice(-value);

    case "hash":
      return f => hashFile(f).slice(-value);

    default:
      throw newError(`Invalid stamp type: ${typeParam}`);
  }
}

function mkdirpWrite(filePath: string, value: string) {
  mkdirp.sync(path.dirname(filePath));
  fs.writeFileSync(filePath, value);
}

function main(params: string[], write = mkdirpWrite) {
  const {
    inputFile,
    outputFile,
    scriptAssets,
    faviconAssets,
    stylesheetAssets,
    assetPaths,
    preloadAssetPaths,
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

  // Convert generic paths to assets
  const guessedAssets = assetPaths.map(path =>
    guessES2015Modules(guessPathToAsset(path), assetPaths)
  );
  const preloadAssets = preloadAssetPaths.map(path => guessPathToAsset(path));

  // Merge the various asset types
  const assets = [
    ...scriptAssets,
    ...faviconAssets,
    ...stylesheetAssets,
    ...guessedAssets,
  ];

  assets.forEach(({ type, uri }) => log("files (%s): %s", type, uri));
  preloadAssets.forEach(({ type, uri }) => log("preload (%s): %s", type, uri));

  const document = parse5.parse(
    fs.readFileSync(inputFile, { encoding: "utf-8" }),
    {
      treeAdapter,
    }
  );

  const body = findElementByName(document, "body");
  if (!body) {
    throw newError("No <body> tag found in HTML document");
  }

  const head = findElementByName(document, "head");
  if (!head) {
    throw newError("No <head> tag found in HTML document");
  }

  function removeRootPath(p: string) {
    for (const r of rootDirs) {
      if (p.startsWith(r)) {
        return p.slice(r.length);
      }
    }
    return p;
  }

  const outputDir = normalizeDirPath(path.dirname(outputFile));
  const rootedOutputDir = removeRootPath(outputDir).replace(/^\//, "./");

  function relativeToHtml(p: string) {
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
   */
  function toUrl(origPath: string) {
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

  const utils: DOMUtils = { body, head };

  // Insertion of various asset preload types
  for (const { type, uri } of preloadAssets) {
    if (PRELOAD_TYPES[type]) {
      insertPreload(utils, toUrl(uri), PRELOAD_TYPES[type]!);
    } else if (strict) {
      throw newError(`Unknown preload type: ${uri}`);
    }
  }

  // Insertion of various asset types
  for (const asset of assets) {
    const { type, uri, attributes } = asset;
    const url = toUrl(uri);

    switch (type) {
      case AssetType.JS:
      case AssetType.MJS:
        insertScript(utils, url, asset as JsAsset);
        break;

      case AssetType.CSS:
        insertCss(utils, url, attributes);
        break;

      case AssetType.FAVICON:
        insertFavicon(utils, url, attributes);
        break;

      default:
        // eslint-disable-next-line no-case-declarations
        const msg = `Unknown asset: ${uri}`;
        if (strict) {
          throw newError(msg);
        } else {
          warn(msg);
        }
    }
  }

  const content = parse5.serialize(document, { treeAdapter });
  write(outputFile, content);
  return 0;
}

export {
  parseArgs,
  main,
  // For testing
  NOW as __NOW,
};
