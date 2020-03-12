// Originally forked from https://github.com/bazelbuild/rules_nodejs/tree/0.41.0/packages/inject-html

const parse5 = require('parse5');
const treeAdapter = require('parse5/lib/tree-adapters/default');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

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
  p = p.replace(/\\/g, '/');
  if (p[0] !== '/' && p[0] !== '.') {
    p = `./${p}`;
  }
  return p;
}

function normalizeDirPath(d) {
  d = normalizePath(d);
  if (!d.endsWith('/')) {
    d = d + '/';
  }
  return d;
}

function removeExternal(p) {
  if (p.startsWith('./external/')) {
    p = normalizePath( p.substring('./external/'.length) );
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

function parseArgs(cmdParams) {
  let inputFile;
  let outputFile;
  let assets = [];
  let rootDirs = [];
  let verbose = false;

  const params = cmdParams.reduce((a, p) => {
    if (p.startsWith("--") && p.match(/^--[a-z]+=/)) {
      a.push( ... p.split('=', 2));
    } else {
      a.push(p);
    }
    return a;
  }, []);

  for (let i = 0; i < params.length; i++) {
    switch (params[i]) {
      case "--assets":
        [assets, i] = readVarArgs(params, i+1);
        break;

      case "--roots":
        [rootDirs, i] = readVarArgs(params, i+1);
        break;

      case "--out":
        outputFile = params[++i];
        break;

      case "--html":
        inputFile = params[++i];
        break;

      case "--verbose":
        verbose = true;
        break;

      default:
        throw Error(`Unknown arg: ${params[i]}`);
    }
  }

  if (!inputFile || !outputFile) {
    throw new Error("required: --html, --out");
  }

  // Normalize paths
  assets = assets.map(normalizePath);
  rootDirs = rootDirs.map(normalizeDirPath);
  inputFile = inputFile && normalizePath(inputFile);
  outputFile = outputFile && normalizePath(outputFile);

  // Always trim the longest root first
  rootDirs.sort((a, b) => b.length - a.length);

  return {inputFile, outputFile, assets, rootDirs, verbose};
}

function createLogger(verbose) {
  if (!verbose) {
    return () => {};
  }

  return function logger(str, ...args) {
    console.log("html-insert-assets: " + str, ...args);
  };
}

function mkdirpWrite(filePath, value) {
  mkdirp.sync(path.dirname(filePath));
  fs.writeFileSync(filePath, value);
}

function main(params, read = fs.readFileSync, write = mkdirpWrite, timestamp = Date.now) {
  const {inputFile, outputFile, assets, rootDirs, verbose} = parseArgs(params);
  const log = createLogger(verbose);

  const jsFiles = assets.filter(s => /\.m?js$/i.test(s));
  const cssFiles = assets.filter(s => /\.css$/.test(s));
  const icoFile = assets.filter(s => /\.ico$/.test(s))[0];

  log("in: %s", inputFile);
  log("out: %s", outputFile);
  log("roots: %s", rootDirs);
  jsFiles.length && log("files (js): %s", jsFiles);
  cssFiles.length && log("files (css): %s", cssFiles);
  icoFile && log("ico: %s", icoFile);

  const document = parse5.parse(read(inputFile, {encoding: 'utf-8'}), {treeAdapter});

  const body = findElementByName(document, 'body');
  if (!body) {
    throw new Error('No <body> tag found in HTML document');
  }

  const head = findElementByName(document, 'head');
  if (!head) {
    throw new Error('No <head> tag found in HTML document');
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
   */
  function toUrl(origPath) {
    let execPath = origPath;

    execPath = removeExternal(execPath);
    execPath = removeRootPath(execPath);
    execPath = relativeToHtml(execPath);
    execPath = normalizePath(execPath);

    if (execPath !== origPath) {
      log("reduce: %s => %s", origPath, execPath);
    }

    const stamp = timestamp(origPath);

    log("stamp: %s @ %s", execPath, stamp);

    return `${execPath}?v=${stamp}`;
  }

  for (const s of jsFiles) {
    // Differential loading: for filenames like
    //  foo.mjs
    //  bar.es2015.js
    // we use a <script type="module" tag so these are only run in browsers that have ES2015 module
    // loading
    if (/\.(es2015\.|m)js$/i.test(s)) {
      const moduleScript = treeAdapter.createElement('script', undefined, [
        {name: 'type', value: 'module'},
        {name: 'src', value: toUrl(s)},
      ]);
      treeAdapter.appendChild(body, moduleScript);
    } else {
      // Other filenames we assume are for non-ESModule browsers, so if the file has a matching
      // ESModule script we add a 'nomodule' attribute
      function hasMatchingModule(file, files) {
        const noExt = file.substring(0, file.length - 3);
        const testMjs = (noExt + '.mjs').toLowerCase();
        const testEs2015 = (noExt + '.es2015.js').toLowerCase();
        const matches = files.filter(t => {
          const lc = t.toLowerCase();
          return lc === testMjs || lc === testEs2015;
        });
        return matches.length > 0;
      }

      // Note: empty string value is equivalent to a bare attribute, according to
      // https://github.com/inikulin/parse5/issues/1
      const nomodule = hasMatchingModule(s, jsFiles) ? [{name: 'nomodule', value: ''}] : [];

      const noModuleScript = treeAdapter.createElement('script', undefined, nomodule.concat([
        {name: 'src', value: toUrl(s)},
      ]));
      treeAdapter.appendChild(body, noModuleScript);
    }
  }

  for (const s of cssFiles) {
    const stylesheet = treeAdapter.createElement('link', undefined, [
      {name: 'rel', value: 'stylesheet'},
      {name: 'href', value: toUrl(s)},
    ]);
    treeAdapter.appendChild(head, stylesheet);
  }

  if (icoFile) {
    const icoLink = treeAdapter.createElement('link', undefined, [
      {name: 'rel', value: 'shortcut icon'},
      {name: 'type', value: 'image/ico'},
      {name: 'href', value: toUrl(icoFile)},
    ]);
    treeAdapter.appendChild(head, icoLink);
  }

  const content = parse5.serialize(document, {treeAdapter});
  write(outputFile, content, {encoding: 'utf-8'});
  return 0;
}

module.exports = {
  parseArgs,
  main
};

if (require.main === module) {
  // We always require the arguments are encoded into a flagfile
  // so that we don't exhaust the command-line limit.
  process.exitCode = main(process.argv.slice(2));
}
