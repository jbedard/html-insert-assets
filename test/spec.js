const {main, parseArgs} = require('../src/main');

describe('HTML inserter', () => {
  const inFile = 'data/some/index.html';
  const outFile = 'out/some/index.html';

  let output;
  function read(file) {
    if (file === inFile) return `<html><head></head><body></body></html>`;
    throw new Error(`no content for ${file}`);
  }
  function write(_, content) {
    output = content;
  }

  it('should noop when no assets', () => {
    expect(main(["--out", outFile, "--html", inFile,], read, write)).toBe(0);
    expect(output).toBe('<html><head></head><body></body></html>');
  });

  it('should inject .js as script tag', () => {
    expect(main(["--out", outFile, "--html", inFile, '--assets', 'path/to/my.js'], read, write, () => 123)).toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script src="/path/to/my.js?v=123"></script></body></html>');
  });

  it('should assume "module js" .mjs extension is type="module"', () => {
    expect(main(["--out", outFile, "--html", inFile, '--assets', 'path/to/my.mjs'], read, write, () => 123))
        .toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script type="module" src="/path/to/my.mjs?v=123"></script></body></html>');
  });

  it('should allow the ".es2015.js" extension is type="module"', () => {
    expect(main(
               ["--out", outFile, "--html", inFile, '--assets', 'path/to/my.es2015.js'], read, write, () => 123))
        .toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script type="module" src="/path/to/my.es2015.js?v=123"></script></body></html>');
  });

  it('should include --out file dir as a default --root', () => {
    expect(main(["--out", outFile, "--html", inFile,
      '--assets', 'out/some/file.js'], read, write, () => 123)).toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script src="/file.js?v=123"></script></body></html>');
  });

  it('should strip the longest matching prefix', () => {
    expect(main(["--out", outFile, "--html", inFile,
      "--roots", 'path', 'path/to',
      '--assets', 'path/to/my.js'], read, write, () => 123)).toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script src="/my.js?v=123"></script></body></html>');
  });

  it('should strip the external workspaces prefix', () => {
    expect(main(["--out", outFile, "--html", inFile,
      "--roots", 'npm/node_modules/zone.js/dist',
      '--assets', 'external/npm/node_modules/zone.js/dist/zone.min.js'], read, write, () => 123)).toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script src="/zone.min.js?v=123"></script></body></html>');
    
  });

  it('should inject .css files as stylesheet link tags', () => {
    expect(main(["--out", outFile, "--html", inFile, '--assets', 'path/to/my.css'], read, write, () => 123)).toBe(0);
    expect(output).toBe(
        '<html><head><link rel="stylesheet" href="/path/to/my.css?v=123"></head><body></body></html>');
  });

  it('should create a pair of script tags for differential loading', () => {
    expect(main(
               ["--out", outFile, "--html", inFile, '--assets', 'path/to/my.js', 'path/to/my.es2015.js'], read, write,
               () => 123))
        .toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script nomodule="" src="/path/to/my.js?v=123"></script><script type="module" src="/path/to/my.es2015.js?v=123"></script></body></html>');
  });
});

describe('parseArgs', () => {
  const REQUIRE_PARAMS = ["--out", "./foo"];

  it('should accept a single --out', () => {
    const {outputFile} = parseArgs(["--out", "./foo"]);

    expect(outputFile).toBe("./foo");
  });

  it('should throw with multiple --out', () => {
    expect(() => parseArgs(["--out", "./foo", "./bar"])).toThrow();
  });

  it('should accept a single --html', () => {
    const {inputFile} = parseArgs([...REQUIRE_PARAMS, "--html", "./foo"]);

    expect(inputFile).toBe("./foo");
  });

  it('should throw with multiple --html', () => {
    expect(() => parseArgs([...REQUIRE_PARAMS, "--html", "./foo", "./bar"])).toThrow();
  });

  it('should accept multiple assets', () => {
    const {assets} = parseArgs([...REQUIRE_PARAMS, "--assets", "./a", "./b", "./c"]);

    expect(assets).toEqual(['./a', './b', './c']);
  });

  it('should accept empty assets', () => {
    expect(() => parseArgs([...REQUIRE_PARAMS, "--assets"])).not.toThrow();
  });

  it('should accept no assets arg', () => {
    const {assets} = parseArgs([...REQUIRE_PARAMS]);

    expect(assets).toEqual([]);
  });

  it('should always include ./ as a root', () => {
    const {rootDirs} = parseArgs([...REQUIRE_PARAMS]);

    expect(rootDirs.includes('./')).toBe(true);
  });

  it('should accept empty roots', () => {
    expect(() => parseArgs([...REQUIRE_PARAMS, "--roots"])).not.toThrow();
  });

  it('should accept no roots arg', () => {
    expect(() => parseArgs([...REQUIRE_PARAMS])).not.toThrow();
  });

  it('should accept multiple roots', () => {
    const {rootDirs} = parseArgs([...REQUIRE_PARAMS, "--roots", "./a/", "../b/", "/abs/path/"]);

    expect(rootDirs.includes('./a/')).toBe(true);
    expect(rootDirs.includes('../b/')).toBe(true);
    expect(rootDirs.includes('/abs/path/')).toBe(true);
  });

  it('should ensure root dirs have a trailing slash', () => {
    const {rootDirs} = parseArgs([...REQUIRE_PARAMS, "--roots", ".", "./a", "../b", "/abs/path"]);

    expect(rootDirs.includes('./')).toBe(true);
    expect(rootDirs.includes('./a/')).toBe(true);
    expect(rootDirs.includes('../b/')).toBe(true);
    expect(rootDirs.includes('/abs/path/')).toBe(true);
  });

  it('should sort roots by specificity', () => {
    const {rootDirs} = parseArgs([...REQUIRE_PARAMS, "--roots", "./a/", "./a/b/", "../b/", "/abs/path/", "/abs/path/b/"]);

    expect(rootDirs).toEqual(["/abs/path/b/", "/abs/path/", "./a/b/", "../b/", "./a/", "./"])
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
    expect(rootDirs).toEqual(["/c/", "/d/", "./"]);
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
    expect(rootDirs).toEqual(["/c/", "/d/", "./"]);
  });
});