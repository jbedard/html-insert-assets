const path = require("path");
const { main, parseArgs } = require("../src/main");

const inFile = path.normalize("./data/some/index.html");

function read(file) {
  if (path.normalize(file) === path.normalize(inFile)) {
    return `<html><head></head><body></body></html>`;
  }

  throw new Error(`no content for ${file}: ${path.normalize(file)}`);
}

let output;
function write(_, content) {
  output = content;
}

function stamper() {
  return 123;
}

function mainTest(args) {
  return main(args, read, write, stamper);
}

describe("HTML inserter", () => {
  function scriptHtml(script) {
    return `<html><head></head><body><script src="${script}?v=123"></script></body></html>`;
  }

  it("should noop when no assets", () => {
    expect(mainTest(["--out", "index.html", "--html", inFile])).toBe(0);
    expect(output).toBe("<html><head></head><body></body></html>");
  });

  it("should normalize asset paths", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--assets",
      "./b/../a.js",
      "./././b.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js?v=123"></script><script src="./b.js?v=123"></script></body></html>'
    );
  });

  it("should ensure asset paths start with a absolute or relative indicator", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--assets",
      "./a.js",
      "/b.js",
      "c.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js?v=123"></script><script src="/b.js?v=123"></script><script src="./c.js?v=123"></script></body></html>'
    );
  });

  it("should inject relative .js as script with path relative to output", () => {
    expect(
      mainTest([
        "--out",
        "./index.html",
        "--html",
        inFile,
        "--assets",
        "./path/to/my.js",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./path/to/my.js", stamper));
  });

  it("should inject .js as script tag when --assets= is used", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets=path/to/my.js",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./path/to/my.js", stamper));
  });

  it("should inject relative .js (no-prefix) as script with path relative to output (no-prefix)", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.js",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./path/to/my.js", stamper));
  });

  it("should inject relative .js as script tag relative to output subdir", () => {
    expect(
      mainTest([
        "--out",
        "sub/index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.js",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("../path/to/my.js"));
  });

  it("should inject absolute .js as script with absolute path", () => {
    expect(
      mainTest([
        "--out",
        "sub/index.html",
        "--html",
        inFile,
        "--assets",
        "/path/to/my.js",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("/path/to/my.js"));
  });

  it("should inject relative .js as script with absolute path when --roots .", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.js",
        "--roots",
        ".",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./path/to/my.js"));
  });

  it("should inject relative .js as script with absolute path when output subdir and --roots .", () => {
    expect(
      mainTest([
        "--out",
        "sub/index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.js",
        "--roots",
        ".",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("../path/to/my.js"));
  });

  it("should inject relative .js as script with path relative with absolute --out also as a root", () => {
    expect(
      mainTest([
        "--out",
        "/root/dir/index.html",
        "--html",
        inFile,
        "--assets",
        "./path/to/my.js",
        "--roots",
        "/root/dir",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./path/to/my.js", stamper));
  });

  it("should inject relative .js as script with path relative subdir with absolute --out also as a root", () => {
    expect(
      mainTest([
        "--out",
        "/root/dir/sub/index.html",
        "--html",
        inFile,
        "--assets",
        "./path/to/my.js",
        "--roots",
        "/root/dir",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("../path/to/my.js", stamper));
  });

  it("should inject relative .js as script tag with absolute path to root dir (same dir)", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.js",
        "--roots",
        ".",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./path/to/my.js"));
  });

  it("should inject relative .js as script tag with absolute path to relative root dir", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.js",
        "--roots",
        "./path/",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./to/my.js"));
  });

  it("should inject relative .js as script tag with absolute path to relative root dir (no prefix)", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.js",
        "--roots",
        "path/",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./to/my.js"));
  });

  it("should inject relative .js as script tag with absolute path to relative root dir (no trailing slash)", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.js",
        "--roots",
        "./path",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./to/my.js"));
  });

  it("should inject absolute .js as script tag with absolute path to absolute root dir", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "/path/to/my.js",
        "--roots",
        "/path/",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./to/my.js"));
  });

  it("should strip the longest matching root prefix", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--roots",
        "path",
        "path/to",
        "--assets",
        "path/to/my.js",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./my.js"));
  });

  it("should strip the external workspaces prefix", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--roots",
        "npm/node_modules/zone.js/dist",
        "--assets",
        "external/npm/node_modules/zone.js/dist/zone.min.js",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./zone.min.js"));
  });

  it("should insert non-local URLs as-is", () => {
    expect(
      mainTest(
        [
          "--out",
          "index.html",
          "--html",
          inFile,
          "--assets",
          "https://ga.com/foo.js",
          "http://foo.com/bar.js",
          "file://local/file.js",
        ],
        read,
        write,
        stamper
      )
    ).toBe(0);
    expect(output).toBe(
      '<html><head></head><body><script src="https://ga.com/foo.js"></script><script src="http://foo.com/bar.js"></script><script src="file://local/file.js"></script></body></html>'
    );
  });

  it("should insert non-local URLs with params as-is", () => {
    expect(
      mainTest(
        [
          "--out",
          "index.html",
          "--html",
          inFile,
          "--assets",
          "https://ga.com/foo.js?v=123",
          "https://ga.com/foo.js?v=123&c",
          "http://foo.com/bar.js?v=123&a=asdf",
          "file://local/file.js?asdf",
        ],
        read,
        write,
        stamper
      )
    ).toBe(0);
    expect(output).toBe(
      '<html><head></head><body><script src="https://ga.com/foo.js?v=123"></script><script src="https://ga.com/foo.js?v=123&amp;c"></script><script src="http://foo.com/bar.js?v=123&amp;a=asdf"></script><script src="file://local/file.js?asdf"></script></body></html>'
    );
  });

  it("should maintain <script> order across local vs non-local URLs", () => {
    expect(
      mainTest(
        [
          "--out",
          "index.html",
          "--html",
          inFile,
          "--assets",
          "path/to/e1.js",
          "https://ga.com/foo.js",
          "path/to/e2.js",
          "http://foo.com/bar.js",
          "path/to/e3.js",
          "file://local/file.js",
        ],
        read,
        write,
        stamper
      )
    ).toBe(0);
    expect(output).toBe(
      '<html><head></head><body><script src="./path/to/e1.js?v=123"></script><script src="https://ga.com/foo.js"></script><script src="./path/to/e2.js?v=123"></script><script src="http://foo.com/bar.js"></script><script src="./path/to/e3.js?v=123"></script><script src="file://local/file.js"></script></body></html>'
    );
  });

  it("should strip the external workspaces prefix in Windows", () => {
    if (path.win32.normalize !== path.normalize) {
      spyOn(path, "normalize").and.callFake(path.win32.normalize);
    }

    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--roots",
        "npm/node_modules/zone.js/dist",
        "--assets",
        "external/npm/node_modules/zone.js/dist/zone.min.js",
      ])
    ).toBe(0);
    expect(output).toBe(scriptHtml("./zone.min.js"));
  });

  it("should inject .css files as stylesheet link tags", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.css",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./path/to/my.css?v=123"></head><body></body></html>'
    );
  });

  it("should strip the longest matching prefix for .css files", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--roots",
        "path",
        "path/to",
        "--assets",
        "path/to/my.css",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./my.css?v=123"></head><body></body></html>'
    );
  });

  it("should inject .css files when --assets= is used", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets=path/to/my.css",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./path/to/my.css?v=123"></head><body></body></html>'
    );
  });

  it("should inject .ico files as shortcut/icon link tags", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.ico",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="shortcut icon" type="image/ico" href="./path/to/my.ico?v=123"></head><body></body></html>'
    );
  });

  it("should strip the longest matching prefix for .ico files", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--roots",
        "path",
        "path/to",
        "--assets",
        "path/to/my.ico",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="shortcut icon" type="image/ico" href="./my.ico?v=123"></head><body></body></html>'
    );
  });
});

describe("modules", () => {
  it('should assume "module js" .mjs extension is type="module"', () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.mjs",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head></head><body><script type="module" src="./path/to/my.mjs?v=123"></script></body></html>'
    );
  });

  it('should assume the ".es2015.js" extension is type="module"', () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.es2015.js",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head></head><body><script type="module" src="./path/to/my.es2015.js?v=123"></script></body></html>'
    );
  });

  it("should create a pair of script tags for differential loading", () => {
    expect(
      mainTest(
        [
          "--out",
          "index.html",
          "--html",
          inFile,
          "--assets",
          "path/to/my.js",
          "path/to/my.es2015.js",
        ],
        read,
        write,
        stamper
      )
    ).toBe(0);
    expect(output).toBe(
      '<html><head></head><body><script nomodule="" src="./path/to/my.js?v=123"></script><script type="module" src="./path/to/my.es2015.js?v=123"></script></body></html>'
    );
  });
});

describe("parseArgs", () => {
  const REQUIRE_PARAMS = ["--out", "foo.html", "--html", "in.html"];

  it("should accept a single --out and --html", () => {
    const { outputFile, inputFile } = parseArgs([
      "--out",
      "./foo.html",
      "--html",
      "index.html",
    ]);

    expect(outputFile).toBe("./foo.html");
    expect(inputFile).toBe("./index.html");
  });

  it("should throw with multiple --out", () => {
    expect(() =>
      parseArgs(["--html", "validhtml", "--out", "./foo", "./bar"])
    ).toThrowError("Unknown arg: ./bar");
  });

  it("should throw with multiple --html", () => {
    expect(() =>
      parseArgs(["--out", "foo", "--html", "./foo", "./bar"])
    ).toThrowError("Unknown arg: ./bar");
  });

  it("should throw with unknown arg", () => {
    expect(() => parseArgs(["--badparam"])).toThrowError(
      "Unknown arg: --badparam"
    );
  });

  it("should throw with no --out and --html", () => {
    expect(() => parseArgs(["--out", "out"])).toThrowError(
      "required: --html, --out"
    );
    expect(() => parseArgs(["--html", "in"])).toThrowError(
      "required: --html, --out"
    );
  });

  it("should normalize roots paths", () => {
    const { rootDirs } = parseArgs([
      ...REQUIRE_PARAMS,
      "--roots",
      "./b/../a/",
      "./././b",
    ]);

    expect(rootDirs).toEqual(["./a/", "./b/"]);
  });

  it("should ensure root paths end with a /", () => {
    const { rootDirs } = parseArgs([
      ...REQUIRE_PARAMS,
      "--roots",
      "../a",
      "./b",
      "c",
      "/d",
    ]);

    expect(rootDirs).toEqual(["../a/", "./b/", "./c/", "/d/"]);
  });

  it("should ensure root paths start with a absolute or relative indicator", () => {
    const { rootDirs } = parseArgs([
      ...REQUIRE_PARAMS,
      "--roots",
      "./a/",
      "b/",
      "/c/",
    ]);

    expect(rootDirs).toEqual(["./a/", "./b/", "/c/"]);
  });

  it("should accept no assets arg", () => {
    const { assets } = parseArgs([...REQUIRE_PARAMS]);

    expect(assets).toEqual({});
  });

  it("should accept empty roots", () => {
    expect(() => parseArgs([...REQUIRE_PARAMS, "--roots"])).not.toThrow();
  });

  it("should accept no roots arg", () => {
    expect(() => parseArgs([...REQUIRE_PARAMS])).not.toThrow();
  });

  it("should accept multiple roots", () => {
    const { rootDirs } = parseArgs([
      ...REQUIRE_PARAMS,
      "--roots",
      "./a/",
      "../b/",
      "/abs/path/",
    ]);

    expect(rootDirs).toEqual([`/abs/path/`, `../b/`, `./a/`]);
  });

  it("should sort roots by specificity", () => {
    const { rootDirs } = parseArgs([
      ...REQUIRE_PARAMS,
      "--roots",
      "./a/",
      "./a/b/",
      "../b/",
      "/abs/path/",
      "/abs/path/b/",
    ]);

    expect(rootDirs).toEqual([
      "/abs/path/b/",
      "/abs/path/",
      `./a/b/`,
      `../b/`,
      `./a/`,
    ]);
  });

  it("should throw on unknown arg", () => {
    expect(() => parseArgs([...REQUIRE_PARAMS, "--foo"])).toThrow();
    expect(() => parseArgs(["--initbad", ...REQUIRE_PARAMS])).toThrow();
  });

  it("should work with all args passed", () => {
    const { outputFile, inputFile, assets, rootDirs } = parseArgs([
      "--out",
      "./out",
      "--html",
      "./in",
      "--assets",
      "./a.js",
      "./b.js",
      "--roots",
      "/c/",
      "/d/",
    ]);

    expect(outputFile).toBe("./out");
    expect(inputFile).toBe("./in");
    expect(assets).toEqual({ js: ["./a.js", "./b.js"] });
    expect(rootDirs).toEqual(["/c/", "/d/"]);
  });

  it("should allow `--param=a b` in addition to `--param a b", () => {
    const { outputFile, inputFile, assets, rootDirs } = parseArgs([
      "--out=./out",
      "--html=./in",
      "--assets=./a.js",
      "./b.js",
      "--roots=/c/",
      "/d/",
    ]);

    expect(outputFile).toBe("./out");
    expect(inputFile).toBe("./in");
    expect(assets).toEqual({ js: ["./a.js", "./b.js"] });
    expect(rootDirs).toEqual(["/c/", "/d/"]);
  });

  it("should accept empty assets", () => {
    expect(() => parseArgs([...REQUIRE_PARAMS, "--assets"])).not.toThrow();
  });

  it("should accept multiple assets", () => {
    const { assets } = parseArgs([
      ...REQUIRE_PARAMS,
      "--assets",
      "./a.js",
      "./b.js",
      "./b.css",
      "./c.ico",
    ]);

    expect(assets).toEqual({
      js: ["./a.js", "./b.js"],
      css: ["./b.css"],
      ico: ["./c.ico"],
    });
  });

  it("should throw when --strict and unknown asset types", () => {
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--strict", "--assets", "foo"])
    ).toThrow();
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--strict", "--assets", "foo.bar"])
    ).toThrow();
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--strict", "--assets", "foo.js.bar"])
    ).toThrow();
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--strict", "--assets", "foo.js", "foo.ts"])
    ).toThrow();
    expect(() =>
      parseArgs([
        ...REQUIRE_PARAMS,
        "--strict",
        "--assets",
        "foo.js",
        "foo.d.ts",
      ])
    ).toThrow();
  });

  it("should not throw when non --strict and unknown asset types", () => {
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--assets", "foo"])
    ).not.toThrow();
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--assets", "foo.bar"])
    ).not.toThrow();
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--assets", "foo.js.bar"])
    ).not.toThrow();
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--assets", "foo.js", "foo.ts"])
    ).not.toThrow();
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--assets", "foo.js", "foo.d.ts"])
    ).not.toThrow();
  });
});
