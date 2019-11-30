// Originally forked from https://github.com/bazelbuild/rules_nodejs/tree/0.41.0/packages/inject-html

const parse5 = require('parse5');
const treeAdapter = require('parse5/lib/tree-adapters/default');
const fs = require('fs');
const path = require('path');

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

function readVarArgs(params, i) {
  const args = [];
  while (i < params.length && !params[i].startsWith("--")) {
    args.push(params[i++]);
  }
  return [args, i - 1];
}

function parseArgs(params) {
  let inputFile;
  let outputFile;
  let assets = [];
  let rootDirs = [];

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

      default:
        throw Error(`Unknown arg: ${params[i]}`);
    }
  }

  // Make dir '/'s consistent. Always trim the longest prefix
  rootDirs.push(path.dirname(outputFile));
  rootDirs = rootDirs.map(r => r.endsWith('/') ? r : r + '/');
  rootDirs.sort((a, b) => b.length - a.length);

  return {inputFile, outputFile, assets, rootDirs};
}

function main(params, read = fs.readFileSync, write = fs.writeFileSync, timestamp = Date.now) {
  const {inputFile, outputFile, assets, rootDirs} = parseArgs(params);

  const document = parse5.parse(read(inputFile, {encoding: 'utf-8'}), {treeAdapter});

  const body = findElementByName(document, 'body');
  if (!body) {
    throw ('No <body> tag found in HTML document');
  }

  const head = findElementByName(document, 'head');
  if (!head) {
    throw ('No <head> tag found in HTML document');
  }

  /**
   * Trims the longest prefix from the path
   */
  function relative(execPath) {
    if (execPath.startsWith('external/')) {
      execPath = execPath.substring('external/'.length);
    }
    for (const r of rootDirs) {
      if (execPath.startsWith(r)) {
        return execPath.substring(r.length);
      }
    }
    return execPath;
  }

  const jsFiles = assets.filter(s => /\.m?js$/i.test(s));
  for (const s of jsFiles) {
    // Differential loading: for filenames like
    //  foo.mjs
    //  bar.es2015.js
    // we use a <script type="module" tag so these are only run in browsers that have ES2015 module
    // loading
    if (/\.(es2015\.|m)js$/i.test(s)) {
      const moduleScript = treeAdapter.createElement('script', undefined, [
        {name: 'type', value: 'module'},
        {name: 'src', value: `/${relative(s)}?v=${timestamp()}`},
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
        {name: 'src', value: `/${relative(s)}?v=${timestamp()}`},
      ]));
      treeAdapter.appendChild(body, noModuleScript);
    }
  }

  for (const s of params.filter(s => /\.css$/.test(s))) {
    const stylesheet = treeAdapter.createElement('link', undefined, [
      {name: 'rel', value: 'stylesheet'},
      {name: 'href', value: `/${relative(s)}?v=${timestamp()}`},
    ]);
    treeAdapter.appendChild(head, stylesheet);
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
