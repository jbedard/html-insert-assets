const inserter = require('../src/main');

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

  it('should do be a no-op', () => {
    expect(inserter.main(["--out", outFile, "--html", inFile,], read, write)).toBe(0);
    expect(output).toBe('<html><head></head><body></body></html>');
  });

  it('should inject script tag', () => {
    expect(inserter.main(["--out", outFile, "--html", inFile, '--assets', 'path/to/my.js'], read, write, () => 123)).toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script src="/path/to/my.js?v=123"></script></body></html>');
  });

  it('should allow the "module js" extension', () => {
    expect(inserter.main(["--out", outFile, "--html", inFile, '--assets', 'path/to/my.mjs'], read, write, () => 123))
        .toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script type="module" src="/path/to/my.mjs?v=123"></script></body></html>');
  });

  it('should allow the ".es2015.js" extension', () => {
    expect(inserter.main(
               ["--out", outFile, "--html", inFile, '--assets', 'path/to/my.es2015.js'], read, write, () => 123))
        .toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script type="module" src="/path/to/my.es2015.js?v=123"></script></body></html>');
  });

  it('should include --out file dir as default --root', () => {
    expect(inserter.main(["--out", outFile, "--html", inFile,
      '--assets', 'out/some/file.js'], read, write, () => 123)).toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script src="/file.js?v=123"></script></body></html>');
  });

  it('should strip longest prefix', () => {
    expect(inserter.main(["--out", outFile, "--html", inFile,
      "--roots", 'path', 'path/to',
      '--assets', 'path/to/my.js'], read, write, () => 123)).toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script src="/my.js?v=123"></script></body></html>');
  });

  it('should strip external workspaces', () => {
    expect(inserter.main(["--out", outFile, "--html", inFile,
      "--roots", 'npm/node_modules/zone.js/dist',
      '--assets', 'external/npm/node_modules/zone.js/dist/zone.min.js'], read, write, () => 123)).toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script src="/zone.min.js?v=123"></script></body></html>');
    
  });

  it('should inject link tag', () => {
    expect(inserter.main(["--out", outFile, "--html", inFile, '--assets', 'path/to/my.css'], read, write, () => 123)).toBe(0);
    expect(output).toBe(
        '<html><head><link rel="stylesheet" href="/path/to/my.css?v=123"></head><body></body></html>');
  });

  it('should create a pair of script tags for differential loading', () => {
    expect(inserter.main(
               ["--out", outFile, "--html", inFile, '--assets', 'path/to/my.js', 'path/to/my.es2015.js'], read, write,
               () => 123))
        .toBe(0);
    expect(output).toBe(
        '<html><head></head><body><script nomodule="" src="/path/to/my.js?v=123"></script><script type="module" src="/path/to/my.es2015.js?v=123"></script></body></html>');
  });
});
