// Originally forked from https://github.com/bazelbuild/rules_nodejs/tree/0.41.0/packages/inject-html
"use strict";

import { Node, TreeAdapter } from "parse5";
import parse5 = require("parse5");
const treeAdapter = require("parse5/lib/tree-adapters/default") as TreeAdapter;

import crypto = require("crypto");
import fs = require("fs");
import path = require("path");
import mkdirp = require("mkdirp");

const NPM_NAME = process.title || "html-insert-assets";

const EXTERNAL_RE = /^[a-z]+:\/\//;
const FILE_TYPE_RE = /\.([a-z]+)$/i;
const EXTERNAL_FILE_TYPE_RE = /^[a-z]+:\/\/.*\.([a-z]+)(\?.*)?$/i;
const ES2015_RE = /\.(es2015\.|m)js$/i;
const NOW = String(Date.now());

// Required + single-use argument restrictions
function dasherize(a: string[]): readonly string[] {
  return a.map(s => `--${s}`);
}
const SINGLE_USE_ARGS = dasherize([
  "html",
  "out",
  "manifest",
  "roots",
  "stamp",
]);
const REQUIRED_ARGS = dasherize(["html", "out"]);

const HELP_MESSAGE = `
Basic Configuration:
  --html path                             The HTML template file to insert assets into.
  --out path                              The output file path.
  --roots path [...path]                  The root directories to strip from asset paths.

Options:
  --stamp [type]                          Add a stamp to asset URLs. Defaults to 'hash=8'
    Types:
      none                                Disable stamping.
      const=X                             Use 'X' as the stamp value.
      now                                 Use the current epoch timestamp as the value.
      lastmod                             Use the last-modified timestamp of each file as the value.
      hash[=#]                            Use the file content sha1 hash of each file as the value.
                                          Optionally sliced to '#' characters.

Assets:
  --scripts [options] path [...paths]     JavaScript files to be inserted as <script> elements.

                                          May be specified multiple times to specify different configurations
                                          and <script> element order (possibly mixed with scripts from --assets).

                                          If neither --module or --nomodule option is specified then the module
                                          type is determined based on the file name and extension.
                                          The .mjs extension or filename ending with .es2015.js is assumed to be
                                          a module. Files are assumed to be nomodule if a corresponding module
                                          with the same filename.
                                          For example:
                                              x.mjs        => module
                                              x.es2015.js  => module
                                              x.js         => nomodule if etiher x.mjs or x.es2015.js exists
    Options:
      --async                             Add the [async] attribute to the <script> element.
      --module                            Add the [type="module"] attribute.
      --nomodule                          Add the [nomodule] attribute.
      --attr name=value [... name=value]  Add custom attributes.

  --stylesheets [options] path [...path]  Stylesheet files to be inserted as <link rel="stylesheet"> elements.
                                          May be specified multiple times to specify different configurations
                                          and <link> element order (possibly mixed with stylesheets from --assets).
    Options:
      --media value                       Add the [media] attribute with the specified value.

  --favicons [options] path [...paths]    Add <link rel="icon"> elements for favicons.
                                          May be specified multiple times to specify different configurations
                                          and <link> element order (possibly mixed with scripts from --assets).
    Options:
      --rel value                         Add the [rel] attribute with the specified value.
      --sizes value                       Add the [sizes] attribute with the specified value.
      --type value                        Add the [type] attribute with the specified value.

  --preload path [...path]                Add <link rel="preload" type="?"> elements.
                                          The [type] is determined based on the file extension.

  --manifest path                         Add a <link rel="manifest"> element to specify a PWA manifest.

  --assets path [...path]                 Generic list of assets. The asset type is determined based on the file extension.
                                          May be specified multiple times to allow configuring asset ordering.

                                          Should normally use the asset specific config such as --scripts.

Miscellaneous:
  --verbose                               Output more logging information.
  --quiet                                 Surpress some logging + warnings about unnecessary assets being passed such as
                                          sourcemap files alongside known files.
  --strict                                Fail on warnings instead of logging to stderr.
  --help                                  Show this help message.
`;

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

export const enum AssetUse {
  SCRIPT,
  STYLESHEET,
  FAVICON,
  PRELOAD,
  MANIFEST,
  UNKNOWN,
}

export type Attributes = { readonly [name: string]: string };

export interface Asset {
  readonly type: AssetType;
  readonly use: AssetUse;
  readonly uri: string;
  readonly attributes: Attributes;
}

export interface JsAsset extends Asset {
  readonly type: AssetType.JS | AssetType.MJS;
  readonly use: AssetUse.SCRIPT | AssetUse.PRELOAD;
  readonly module?: boolean;
}

function isJsAsset(asset: Asset): asset is JsAsset {
  return asset.type === AssetType.JS || asset.type === AssetType.MJS;
}

// https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content#What_types_of_content_can_be_preloaded
const PRELOAD_TYPES = Object.freeze<Partial<{ [type in AssetType]: string }>>({
  [AssetType.JS]: "script",
  [AssetType.MJS]: "script",
  [AssetType.CSS]: "style",
  [AssetType.FAVICON]: "image",
  [AssetType.IMAGE]: "image",
});

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

function guessTypeFromFilename(name: string) {
  const ext = filenameToExtension(name);

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

function guessUseAttributes(uri: string, use: AssetUse): Attributes {
  switch (use) {
    case AssetUse.FAVICON:
      return {
        type: filenameToImageMimeType(uri),
      };

    default:
      return {};
  }
}

function guessAssetUseFromType(type: AssetType): AssetUse {
  switch (type) {
    case AssetType.CSS:
      return AssetUse.STYLESHEET;
    case AssetType.JS:
    case AssetType.MJS:
      return AssetUse.SCRIPT;
    case AssetType.FAVICON:
      return AssetUse.FAVICON;
    default:
      return AssetUse.UNKNOWN;
  }
}

function guessAssetFromPath(uri: string, knownUse?: AssetUse): Asset {
  const type = guessTypeFromFilename(uri);
  const use = knownUse ?? guessAssetUseFromType(type);
  const attributes = guessUseAttributes(uri, use);

  return {
    type,
    use,
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
  const args: string[] = [];
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

function readGenericAssets(
  assets: Asset[],
  params: string[],
  i: number,
  knownUse?: AssetUse
) {
  while (i < params.length && !params[i].startsWith("--")) {
    readGenericAsset(assets, params[i++], knownUse);
  }
  return i - 1;
}

function readGenericAsset(assets: Asset[], uri: string, knownUse?: AssetUse) {
  assets.push(guessAssetFromPath(uri, knownUse));
}

function readScriptArgs(assets: Asset[], params: string[], i: number) {
  const attributes: { [attr: string]: string } = {};

  let module: boolean | undefined = undefined;

  while (i < params.length && params[i].startsWith("--")) {
    const param = params[i++];

    switch (param) {
      case "--async":
        attributes["async"] = "";
        break;

      case "--module":
      case "--nomodule":
        if (module !== undefined) {
          throw newError("Both --module and --nomodule specified");
        }

        module = param === "--module";
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

  do {
    const uri = params[i];
    const type = module ? AssetType.MJS : AssetType.JS;

    const jsAsset: JsAsset = {
      type,
      use: AssetUse.SCRIPT,
      uri,
      module,
      attributes,
    };

    assets.push(jsAsset);
  } while (++i < params.length && !params[i].startsWith("--"));

  return i - 1;
}

function readFaviconArgs(assets: Asset[], params: string[], i: number) {
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

    assets.push({
      type: AssetType.FAVICON,
      use: AssetUse.FAVICON,
      uri,
      attributes: {
        type: filenameToImageMimeType(uri),
        ...attributes,
      },
    });
  } while (i < params.length && !params[++i].startsWith("--"));

  return i - 1;
}

function readStylesheetArgs(assets: Asset[], params: string[], i: number) {
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

    assets.push({
      type: AssetType.CSS,
      use: AssetUse.STYLESHEET,
      uri,
      attributes,
    });
  } while (i < params.length && !params[++i].startsWith("--"));

  return i - 1;
}

function verifyArguments(args: string[]) {
  if (args.includes("--help")) {
    return;
  }

  for (const arg of REQUIRED_ARGS) {
    const idx = args.indexOf(arg);
    if (idx === -1 || idx >= args.length || args[idx + 1].startsWith("--")) {
      throw newError(`Required arguments: ${REQUIRED_ARGS.join(", ")}`);
    }
  }

  for (const arg of SINGLE_USE_ARGS) {
    if (args.includes(arg, 1 + args.indexOf(arg))) {
      throw newError(`Duplicate arg: ${arg}`);
    }
  }
}

function parseArgs(cmdParams: string[]) {
  let inputFile = "";
  let outputFile = "";

  // All assets to be inserted into the DOM, of all types.
  // In the order parsed from the CLI.
  const assets: Asset[] = [];

  let rootDirs: string[] = [];
  let verbose = false;
  let strict = false;
  let quiet = false;
  let help = false;
  let stampType = "hash=8";

  const params = cmdParams.reduce<string[]>((a, p) => {
    if (p.startsWith("--") && p.match(/^--[a-z]+=/)) {
      a.push(...p.split("=", 2));
    } else {
      a.push(p);
    }
    return a;
  }, []);

  verifyArguments(params);

  for (let i = 0; i < params.length; i++) {
    switch (params[i]) {
      case "--assets":
        i = readGenericAssets(assets, params, i + 1);
        break;

      case "--scripts":
        i = readScriptArgs(assets, params, i + 1);
        break;

      case "--favicons":
        i = readFaviconArgs(assets, params, i + 1);
        break;

      case "--stylesheets":
        i = readStylesheetArgs(assets, params, i + 1);
        break;

      case "--preload":
        i = readGenericAssets(assets, params, i + 1, AssetUse.PRELOAD);
        break;

      case "--manifest":
        readGenericAsset(assets, params[++i], AssetUse.MANIFEST);
        break;

      case "--strict":
        strict = true;
        break;

      case "--quiet":
        quiet = true;
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

      case "--help":
        help = true;
        break;

      case "--verbose":
        verbose = true;
        break;

      default:
        throw newError(`Unknown arg: ${params[i]}`);
    }
  }

  return {
    inputFile,
    outputFile,
    assets,
    rootDirs,
    stampType,
    strict,
    quiet,
    verbose,
    help,
  };
}

function hasMatchingModule(uri: string, all: Asset[]) {
  const noExt = uri.slice(0, uri.lastIndexOf("."));
  const testMjs = `${noExt}.mjs`.toLowerCase();
  const testEs2015 = `${noExt}.es2015.js`.toLowerCase();
  return all.some(t => {
    const lc = t.uri.toLowerCase();
    return lc === testMjs || lc === testEs2015;
  });
}

// Detect if an Asset is a JsAsset without a known module type
function isJsAssetWithoutModule(
  asset: Asset
): asset is JsAsset & { module: undefined } {
  return !(
    // No processing for external resources
    (
      EXTERNAL_RE.test(asset.uri) ||
      // Only JS assets have any processing
      !isJsAsset(asset) ||
      // If the module was explicitly defined then no need to guess
      asset.module !== undefined
    )
  );
}

// Guess JsAsset module type based on file info
// ESModule is assumed for filenames like
//  foo.mjs
//  bar.es2015.js
function detectModuleByType(a: Asset) {
  if (isJsAssetWithoutModule(a) && ES2015_RE.test(a.uri)) {
    return { ...a, module: true };
  }

  return a;
}

// Guess JsAsset module type based on association with other files
// If a non-ESModule file has a matching ESModule version then mark it as [nomodule]
function detectModuleTypeByAssociation(a: Asset, _: number, all: Asset[]) {
  if (isJsAssetWithoutModule(a) && hasMatchingModule(a.uri, all)) {
    return { ...a, module: false };
  }
  return a;
}

function processAssets(assets: Asset[]): Asset[] {
  return assets.map(detectModuleByType).map(detectModuleTypeByAssociation);
}

function attributesToParse5(attributes: Attributes): parse5.Attribute[] {
  return Object.entries(attributes).map(([name, value]) => ({ name, value }));
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

function insertLink(
  { head }: DOMUtils,
  type: string,
  url: string,
  attributes: Attributes
) {
  const link = treeAdapter.createElement(
    "link",
    "",
    attributesToParse5({
      rel: type,
      href: url,
      ...attributes,
    })
  );

  treeAdapter.appendChild(head, link);
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
  return new Error(`${str} ${args.join(" ")}`.trim());
}

function fileLastModified(file: string) {
  if (fs.existsSync(file)) {
    return String(fs.statSync(file).mtime.getTime());
  }

  warn(`Failed to find ${file} to stamp. Will fallback to timestamp.`);

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

  warn(`Failed to find ${file} to stamp. Will fallback to timestamp.`);

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

function normalizeArgPaths(
  inputRootDirs: string[],
  inputInputFile: string,
  inputOutputFile: string
) {
  const rootDirs = inputRootDirs.map(normalizeDirPath);
  const inputFile = normalizePath(inputInputFile);
  const outputFile = normalizePath(inputOutputFile);

  // Always trim the longest root first
  rootDirs.sort((a, b) => b.length - a.length);

  return { rootDirs, inputFile, outputFile };
}

function isSourceMap({ uri }: Asset, assets: Asset[]) {
  if (path.extname(uri) !== ".map") {
    return false;
  }

  const nonMap = uri.slice(0, -4);
  return assets.some(a => a.uri === nonMap);
}

function main(params: string[], write = mkdirpWrite) {
  const {
    inputFile: inputInputFile,
    outputFile: inputOutputFile,
    assets,
    rootDirs: inputRootDirs,
    stampType,
    strict,
    verbose,
    quiet,
    help,
  } = parseArgs(params);

  if (help) {
    console.log(HELP_MESSAGE);
    return 0;
  }

  // Normalize fs paths, assets done separately later
  const { inputFile, outputFile, rootDirs } = normalizeArgPaths(
    inputRootDirs,
    inputInputFile,
    inputOutputFile
  );

  const log = createLogger(verbose);
  const stamper = createStamper(stampType);

  // Log the parsed params
  log("in: %s", inputFile);
  log("out: %s", outputFile);
  log("roots: %s", rootDirs);

  // Process and potentially modify the assets from the CLI
  const processedAssets = processAssets(assets);

  // Log all assets
  processedAssets.forEach(({ type, use, uri }) =>
    log("files (%s, %s): %s", type, use, uri)
  );

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

  // Insertion of various asset types
  for (const asset of processedAssets) {
    const { type, use, uri, attributes } = asset;
    const url = toUrl(uri);

    switch (use) {
      case AssetUse.SCRIPT:
        insertScript(utils, url, asset as JsAsset);
        break;

      case AssetUse.STYLESHEET:
        insertLink(utils, "stylesheet", url, attributes);
        break;

      case AssetUse.FAVICON:
        insertLink(utils, "icon", url, attributes);
        break;

      case AssetUse.MANIFEST:
        insertLink(utils, "manifest", url, attributes);
        break;

      case AssetUse.PRELOAD:
        if (PRELOAD_TYPES[type]) {
          insertLink(utils, "preload", url, {
            as: PRELOAD_TYPES[type]!,
            ...attributes,
          });
        } else if (strict) {
          throw newError(`Unknown preload type: ${url}`);
        }

        break;

      default:
        // eslint-disable-next-line no-case-declarations
        const msg = `Unknown asset usage: ${uri}`;
        if (strict) {
          throw newError(msg);
        } else if (!(quiet && isSourceMap(asset, processedAssets))) {
          warn(msg);
        }
    }
  }

  const content = parse5.serialize(document, { treeAdapter });
  write(outputFile, content);
  return 0;
}

export {
  main,
  // For testing
  parseArgs as __parseArgs,
  NOW as __NOW,
  normalizeArgPaths as __normalizeArgPaths,
};
