const path = require('path');
const {main, parseArgs} = require('../src/main');

const inFile = path.normalize('./data/some/index.html');

function read(file) {
  if (path.normalize(file) === path.normalize(inFile)) return `<html><head></head><body></body></html>`;
  throw new Error(`no content for ${file}: ${path.normalize(file)}`);
}

let output;
function write(_, content) {
  output = content;
}

function stamper() {
  return 123;
}

describe('HTML inserter', () => {
  function scriptHtml(script) {
    return `<html><head></head><body><script src="${script}?v=123"></script></body></html>`
  }

  it('should noop when no assets', () => {
    expect(main(["--out", "index.html", "--html", inFile], read, write)).toBe(0);
    expect(output).toBe('<html><head></head><body></body></html>');
  });

  it('should inject relative .js as script with path relative to output', () => {
    expect(main(["--out", "./index.html", "--html", inFile, '--assets', './path/to/my.js'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./path/to/my.js', stamper));
  });

  it('should inject .js as script tag when --assets= is used', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets=path/to/my.js'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./path/to/my.js', stamper));
  });
      
  it('should inject relative .js (no-prefix) as script with path relative to output (no-prefix)', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets', 'path/to/my.js'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./path/to/my.js', stamper));
  });

  it('should inject relative .js as script tag relative to output subdir', () => {
    expect(main(["--out", "sub/index.html", "--html", inFile, '--assets', 'path/to/my.js'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('../path/to/my.js'));
  });

  it('should inject absolute .js as script with absolute path', () => {
    expect(main(["--out", "sub/index.html", "--html", inFile, '--assets', '/path/to/my.js'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('/path/to/my.js'));
  });

  it('should inject relative .js as script with absolute path when --roots .', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets', 'path/to/my.js', '--roots', '.'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./path/to/my.js'));
  });

  it('should inject relative .js as script with absolute path when output subdir and --roots .', () => {
    expect(main(["--out", "sub/index.html", "--html", inFile, '--assets', 'path/to/my.js', '--roots', '.'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('../path/to/my.js'));
  });

  it('should inject relative .js as script with path relative with absolute --out also as a root', () => {
    expect(main(["--out", "/root/dir/index.html", "--html", inFile, '--assets', './path/to/my.js', '--roots', '/root/dir'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./path/to/my.js', stamper));
  });

  it('should inject relative .js as script with path relative subdir with absolute --out also as a root', () => {
    expect(main(["--out", "/root/dir/sub/index.html", "--html", inFile, '--assets', './path/to/my.js', '--roots', '/root/dir'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('../path/to/my.js', stamper));
  });

  it('should inject relative .js as script tag with absolute path to root dir (same dir)', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets', 'path/to/my.js', '--roots', '.'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./path/to/my.js'));
  });

  it('should inject relative .js as script tag with absolute path to relative root dir', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets', 'path/to/my.js', '--roots', './path/'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./to/my.js'));
  });

  it('should inject relative .js as script tag with absolute path to relative root dir (no prefix)', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets', 'path/to/my.js', '--roots', 'path/'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./to/my.js'));
  });

  it('should inject relative .js as script tag with absolute path to relative root dir (no trailing slash)', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets', 'path/to/my.js', '--roots', './path'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./to/my.js'));
  });

  it('should inject absolute .js as script tag with absolute path to absolute root dir', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets', '/path/to/my.js', '--roots', '/path/'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./to/my.js'));
  });

  it('should strip the longest matching root prefix', () => {
    expect(main(["--out", "index.html", "--html", inFile,
      "--roots", 'path', 'path/to',
      '--assets', 'path/to/my.js'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./my.js'));
  });

  it('should strip the external workspaces prefix', () => {
    expect(main(["--out", "index.html", "--html", inFile,
      "--roots", 'npm/node_modules/zone.js/dist',
      '--assets', 'external/npm/node_modules/zone.js/dist/zone.min.js'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./zone.min.js'));
  });

  it('should strip the external workspaces prefix in Windows', () => {
    if (path.win32.normalize !== path.normalize) {
      spyOn(path, 'normalize').and.callFake(path.win32.normalize);
    }

    expect(main(["--out", "index.html", "--html", inFile,
      "--roots", 'npm/node_modules/zone.js/dist',
      '--assets', 'external/npm/node_modules/zone.js/dist/zone.min.js'], read, write, stamper)).toBe(0);
    expect(output).toBe(scriptHtml('./zone.min.js'));
  });

  it('should inject .css files as stylesheet link tags', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets', 'path/to/my.css'], read, write, stamper)).toBe(0);
    expect(output).toBe(
        '<html><head><link rel="stylesheet" href="./path/to/my.css?v=123"></head><body></body></html>');
  });

  it('should strip the longest matching prefix for .css files', () => {
    expect(main(["--out", "index.html", "--html", inFile,
      "--roots", 'path', 'path/to',
      '--assets', 'path/to/my.css'], read, write, stamper)).toBe(0);
    expect(output).toBe(
        '<html><head><link rel="stylesheet" href="./my.css?v=123"></head><body></body></html>');
  });

  it('should inject .css files when --assets= is used', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets=path/to/my.css'], read, write, stamper)).toBe(0);
    expect(output).toBe(
        '<html><head><link rel="stylesheet" href="./path/to/my.css?v=123"></head><body></body></html>');
  });

  it('should inject .ico files as shortcut/icon link tags', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets', 'path/to/my.ico'], read, write, stamper)).toBe(0);
    expect(output).toBe(
        '<html><head><link rel="shortcut icon" type="image/ico" href="./path/to/my.ico?v=123"></head><body></body></html>');
  });

  it('should strip the longest matching prefix for .ico files', () => {
    expect(main(["--out", "index.html", "--html", inFile,
      "--roots", 'path', 'path/to',
      '--assets', 'path/to/my.ico'], read, write, stamper)).toBe(0);
    expect(output).toBe(
        '<html><head><link rel="shortcut icon" type="image/ico" href="./my.ico?v=123"></head><body></body></html>');
  });
});

describe("modules", () => {
  it('should assume "module js" .mjs extension is type="module"', () => {
    expect(main(["--out", "index.html", "--html", inFile, '--assets', 'path/to/my.mjs'], read, write, stamper))
        .toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script type="module" src="./path/to/my.mjs?v=123"></script></body></html>');
  });

  it('should assume the ".es2015.js" extension is type="module"', () => {
    expect(main(
               ["--out", "index.html", "--html", inFile, '--assets', 'path/to/my.es2015.js'], read, write, stamper))
        .toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script type="module" src="./path/to/my.es2015.js?v=123"></script></body></html>');
  });

  it('should create a pair of script tags for differential loading', () => {
    expect(main(
               ["--out", "index.html", "--html", inFile, '--assets', 'path/to/my.js', 'path/to/my.es2015.js'], read, write,
               stamper))
        .toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script nomodule="" src="./path/to/my.js?v=123"></script><script type="module" src="./path/to/my.es2015.js?v=123"></script></body></html>');
  });
});

describe('parseArgs', () => {
  const REQUIRE_PARAMS = ["--out", "foo.html", "--html", "in.html"];

  it('should accept a single --out and --html', () => {
    const {outputFile, inputFile} = parseArgs(["--out", "./foo.html", "--html", "index.html"]);

    expect(outputFile).toBe("./foo.html");
    expect(inputFile).toBe("./index.html");
  });

  it('should throw with multiple --out', () => {
    expect(() => parseArgs(["--html", "validhtml", "--out", "./foo", "./bar"])).toThrowError("Unknown arg: ./bar");
  });

  it('should throw with multiple --html', () => {
    expect(() => parseArgs(["--out", "foo", , "--html", "./foo", "./bar"])).toThrowError("Unknown arg: ./bar");
  });

  it('should throw with unknown arg', () => {
    expect(() => parseArgs(["--badparam"])).toThrowError("Unknown arg: --badparam");
  });

  it('should throw with no --out and --html', () => {
    expect(() => parseArgs(["--out", "out"])).toThrowError("required: --html, --out");
    expect(() => parseArgs(["--html", "in"])).toThrowError("required: --html, --out");
  });

  it('should accept multiple assets', () => {
    const {assets} = parseArgs([...REQUIRE_PARAMS, "--assets", "./a", "./b", "./c"]);

    expect(assets).toEqual(['./a', './b', './c']);
  });

  it('should normalize asset paths', () => {
    const {assets} = parseArgs([...REQUIRE_PARAMS, "--assets", "./b/../a", "./././b"]);

    expect(assets).toEqual(['./a', './b']);
  });

  it('should ensure asset paths start with a absolute or relative indicator', () => {
    const {assets} = parseArgs([...REQUIRE_PARAMS, "--assets", "./a", "/b", "c"]);

    expect(assets).toEqual(['./a', '/b', './c']);
  });

  it('should normalize roots paths', () => {
    const {rootDirs} = parseArgs([...REQUIRE_PARAMS, "--roots", "./b/../a/", "./././b"]);

    expect(rootDirs).toEqual(['./a/', './b/']);
  });

  it('should ensure root paths end with a /', () => {
    const {rootDirs} = parseArgs([...REQUIRE_PARAMS, "--roots", "../a", "./b", "c", "/d"]);

    expect(rootDirs).toEqual(['../a/', './b/', './c/', '/d/']);
  });

  it('should ensure root paths start with a absolute or relative indicator', () => {
    const {rootDirs} = parseArgs([...REQUIRE_PARAMS, "--roots", "./a/", "b/", "/c/"]);

    expect(rootDirs).toEqual(['./a/', './b/', '/c/']);
  });

  it('should accept empty assets', () => {
    expect(() => parseArgs([...REQUIRE_PARAMS, "--assets"])).not.toThrow();
  });

  it('should accept no assets arg', () => {
    const {assets} = parseArgs([...REQUIRE_PARAMS]);

    expect(assets).toEqual([]);
  });

  it('should accept empty roots', () => {
    expect(() => parseArgs([...REQUIRE_PARAMS, "--roots"])).not.toThrow();
  });

  it('should accept no roots arg', () => {
    expect(() => parseArgs([...REQUIRE_PARAMS])).not.toThrow();
  });

  it('should accept multiple roots', () => {
    const {rootDirs} = parseArgs([...REQUIRE_PARAMS, "--roots", "./a/", "../b/", "/abs/path/"]);

    expect(rootDirs).toEqual([
      `/abs/path/`,
      `../b/`,
      `./a/`,
    ]);
  });

  it('should sort roots by specificity', () => {
    const {rootDirs} = parseArgs([...REQUIRE_PARAMS, "--roots", "./a/", "./a/b/", "../b/", "/abs/path/", "/abs/path/b/"]);

    expect(rootDirs).toEqual([
      "/abs/path/b/",
      "/abs/path/",
      `./a/b/`,
      `../b/`,
      `./a/`,
    ]);
  });

  it('should throw on unknown arg', () => {
    expect(() => parseArgs([...REQUIRE_PARAMS, "--foo"])).toThrow();
    expect(() => parseArgs(["--initbad", ...REQUIRE_PARAMS])).toThrow();
  });

  it('should work with all args passed', () => {
    const {outputFile, inputFile, assets, rootDirs} = parseArgs([
      "--out", "./out",
      "--html", "./in",
      "--assets", "./a", "./b",
      "--roots", "/c/", "/d/"
    ]);

    expect(outputFile).toBe("./out");
    expect(inputFile).toBe("./in");
    expect(assets).toEqual(["./a", "./b"]);
    expect(rootDirs).toEqual(["/c/", "/d/"]);
  });

  it('should allow `--param=a b` in addition to `--param a b', () => {
    const {outputFile, inputFile, assets, rootDirs} = parseArgs([
      "--out=./out",
      "--html=./in",
      "--assets=./a", "./b",
      "--roots=/c/", "/d/"
    ]);

    expect(outputFile).toBe("./out");
    expect(inputFile).toBe("./in");
    expect(assets).toEqual(["./a", "./b"]);
    expect(rootDirs).toEqual(["/c/", "/d/"]);
  });
});