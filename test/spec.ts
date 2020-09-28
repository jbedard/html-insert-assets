"use strict";

const path = require("path");
const { main, parseArgs, __NOW } = require("../src/main");

const inFile = "./test/data/index-template.html";
const inFileHTML5 = "./test/data/index-html5-template.html";

const JS_ASSET_ALERT = "./test/data/assets/alert.js";
const JS_ASSET_ALERT_HASH = "6yOVKodXSr6FwCnpf6HWhXZl2w"; // original: "6yOVKod/XSr6FwCnpf6HWhXZl2w=";

const MJS_ASSET_ANSWER = "./test/data/assets/answer.mjs";
const MJS_ASSET_ANSWER_HASH = "M2lyTaM7ZJXfwxvnwmsz2vvbk"; // original: "M2lyTaM7ZJXfwxvnwmsz2v+v+bk=";

const ICO_ASSET_GITHUB = "./test/data/assets/github.ico";
const ICO_ASSET_GITHUB_HASH = "B1oibWKIpml3j2X37M3ZZ3CSU"; // original: "B+1oi+bWKIpml3j2X37M3ZZ3CSU=";

const CSS_ASSET_RESET = "./test/data/assets/reset.css";
const CSS_ASSET_RESET_HASH = "D3C2hyvo84Oc7dvX3WUThJ6oUl4"; // original: "D3C2hyvo84Oc7dvX3WUThJ6oUl4=";

let output = "";
function write(_: any, content: string) {
  output = content;
}

afterEach(() => (output = ""));

function mainTest(args: string[]) {
  // Disable hashing for basic tests
  args.push("--stamp", "none");

  return main(args, write);
}

function scriptHtml(script: string) {
  return `<html><head></head><body><script src="${script}"></script></body></html>`;
}

describe("base", () => {
  it("should noop when no assets", () => {
    expect(mainTest(["--out", "index.html", "--html", inFile])).toBe(0);
    expect(output).toBe("<html><head></head><body></body></html>");
  });

  it("should noop when no assets with html5 template", () => {
    expect(mainTest(["--out", "index.html", "--html", inFileHTML5])).toBe(0);
    expect(output).toBe("<!DOCTYPE html><html><head></head><body></body></html>");
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
      '<html><head></head><body><script src="./a.js"></script><script src="./b.js"></script></body></html>'
    );
  });

  it("should throw when --strict and unknown asset types", () => {
    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--strict",
        "--assets",
        "foo",
      ])
    ).toThrow();

    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--strict",
        "--assets",
        "foo.bar",
      ])
    ).toThrow();

    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--strict",
        "--assets",
        "foo.js.bar",
      ])
    ).toThrow();

    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--strict",
        "--assets",
        "foo.js",
        "foo.ts",
      ])
    ).toThrow();

    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--strict",
        "--assets",
        "foo.js",
        "foo.d.ts",
      ])
    ).toThrow();
  });

  it("should not throw when non --strict and unknown asset types", () => {
    expect(() =>
      mainTest(["--out", "index.html", "--html", inFile, "--assets", "foo"])
    ).not.toThrow();

    expect(() =>
      mainTest(["--out", "index.html", "--html", inFile, "--assets", "foo.bar"])
    ).not.toThrow();

    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "foo.js.bar",
      ])
    ).not.toThrow();

    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "foo.js",
        "foo.ts",
      ])
    ).not.toThrow();

    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "foo.js",
        "foo.d.ts",
      ])
    ).not.toThrow();
  });
});

describe("js assets", () => {
  it("should inject js assets as <script> tags", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--assets",
      "a.js",
    ]);
    expect(output).toMatch(/<script.*\.\/a\.js/);
  });

  it("should inject js assets as <script> tags with html5 template", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFileHTML5,
      "--assets",
      "a.js",
    ]);
    expect(output).toMatch(/<script.*\.\/a\.js/);
  });

  it("should ensure js asset paths start with a absolute or relative indicator", () => {
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
      '<html><head></head><body><script src="./a.js"></script><script src="/b.js"></script><script src="./c.js"></script></body></html>'
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
    expect(output).toBe(scriptHtml("./path/to/my.js"));
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
    expect(output).toBe(scriptHtml("./path/to/my.js"));
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
    expect(output).toBe(scriptHtml("./path/to/my.js"));
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
    expect(output).toBe(scriptHtml("./path/to/my.js"));
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
    expect(output).toBe(scriptHtml("../path/to/my.js"));
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
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "https://ga.com/foo.js",
        "http://foo.com/bar.js",
        "file://local/file.js",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head></head><body><script src="https://ga.com/foo.js"></script><script src="http://foo.com/bar.js"></script><script src="file://local/file.js"></script></body></html>'
    );
  });

  it("should maintain <script> order across local vs non-local URLs", () => {
    expect(
      mainTest([
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
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head></head><body><script src="./path/to/e1.js"></script><script src="https://ga.com/foo.js"></script><script src="./path/to/e2.js"></script><script src="http://foo.com/bar.js"></script><script src="./path/to/e3.js"></script><script src="file://local/file.js"></script></body></html>'
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
});

describe("css assets", () => {
  it("should ensure css asset paths start with a absolute or relative indicator", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--assets",
      "./a.css",
      "/b.css",
      "c.css",
    ]);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./a.css"><link rel="stylesheet" href="/b.css"><link rel="stylesheet" href="./c.css"></head><body></body></html>'
    );
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
      '<html><head><link rel="stylesheet" href="./path/to/my.css"></head><body></body></html>'
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
      '<html><head><link rel="stylesheet" href="./my.css"></head><body></body></html>'
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
      '<html><head><link rel="stylesheet" href="./path/to/my.css"></head><body></body></html>'
    );
  });
});

describe("ico assets", () => {
  it("should ensure ico asset paths start with a absolute or relative indicator", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--assets",
      "./a.ico",
      "/b.ico",
      "c.ico",
    ]);
    expect(output).toBe(
      '<html><head><link rel="shortcut icon" type="image/ico" href="./a.ico"><link rel="shortcut icon" type="image/ico" href="/b.ico"><link rel="shortcut icon" type="image/ico" href="./c.ico"></head><body></body></html>'
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
      '<html><head><link rel="shortcut icon" type="image/ico" href="./path/to/my.ico"></head><body></body></html>'
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
      '<html><head><link rel="shortcut icon" type="image/ico" href="./my.ico"></head><body></body></html>'
    );
  });
});

describe("js modules", () => {
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
      '<html><head></head><body><script type="module" src="./path/to/my.mjs"></script></body></html>'
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
      '<html><head></head><body><script type="module" src="./path/to/my.es2015.js"></script></body></html>'
    );
  });

  it("should create a pair of script tags for differential loading (.js, .es2015.js)", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.js",
        "path/to/my.es2015.js",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head></head><body><script nomodule="" src="./path/to/my.js"></script><script type="module" src="./path/to/my.es2015.js"></script></body></html>'
    );
  });

  it("should create a pair of script tags for differential loading (.js, .mjs)", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.js",
        "path/to/my.mjs",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head></head><body><script nomodule="" src="./path/to/my.js"></script><script type="module" src="./path/to/my.mjs"></script></body></html>'
    );
  });
});

describe("preloading", () => {
  it("should support preload type=script (js)", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--preload",
        "path/to/my.js",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="preload" href="./path/to/my.js" as="script"></head><body></body></html>'
    );
  });

  it("should support preload type=script (mjs)", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--preload",
        "path/to/my.mjs",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="preload" href="./path/to/my.mjs" as="script"></head><body></body></html>'
    );
  });

  it("should support preload type=style", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--preload",
        "path/to/my.css",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="preload" href="./path/to/my.css" as="style"></head><body></body></html>'
    );
  });

  it("should insert <link preload> before <link stylesheet> in <head>", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        "path/to/my.css",
        "--preload",
        "path/to/my.css",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="preload" href="./path/to/my.css" as="style"><link rel="stylesheet" href="./path/to/my.css"></head><body></body></html>'
    );
  });

  it("should support preload image types (ico, jpg, png, gif)", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--preload",
        "./my.ico",
        "./my.jpg",
        "./my.png",
        "./my.gif",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="preload" href="./my.ico" as="image"><link rel="preload" href="./my.jpg" as="image"><link rel="preload" href="./my.png" as="image"><link rel="preload" href="./my.gif" as="image"></head><body></body></html>'
    );
  });

  it("should normalize URLs", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--preload",
        "./rel.ico",
        "rel.ico",
        "rel/.././rel.ico",
        "/abs.ico",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="preload" href="./rel.ico" as="image"><link rel="preload" href="./rel.ico" as="image"><link rel="preload" href="./rel.ico" as="image"><link rel="preload" href="/abs.ico" as="image"></head><body></body></html>'
    );
  });

  it("should support external URLs", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--preload",
        "http://foo.com/a.js",
        "https://foo.com/a.js",
        "https://foo.com/a.js?a=b",
        "file://foo.com/a.css",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="preload" href="http://foo.com/a.js" as="script"><link rel="preload" href="https://foo.com/a.js" as="script"><link rel="preload" href="https://foo.com/a.js?a=b" as="script"><link rel="preload" href="file://foo.com/a.css" as="style"></head><body></body></html>'
    );
  });

  it("should throw when --strict and unknown asset types", () => {
    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--strict",
        "--preload",
        "foo",
      ])
    ).toThrow();

    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--strict",
        "--preload",
        "foo.bar",
      ])
    ).toThrow();

    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--strict",
        "--preload",
        "foo.js.bar",
      ])
    ).toThrow();

    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--strict",
        "--preload",
        "foo.js",
        "foo.ts",
      ])
    ).toThrow();

    expect(() =>
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--strict",
        "--preload",
        "foo.js",
        "foo.d.ts",
      ])
    ).toThrow();
  });
});

describe("stamping", () => {
  function stampTest(args: string[]) {
    return main(args, write);
  }

  it("should support stamping with a constant", () => {
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--stamp",
        "const=42",
        "--assets",
        "./script.js",
        "./script-module.mjs",
        "./style.css",
        "./favicon.ico",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./style.css?v=42"><link rel="shortcut icon" type="image/ico" href="./favicon.ico?v=42"></head><body><script src="./script.js?v=42"></script><script type="module" src="./script-module.mjs?v=42"></script></body></html>'
    );
  });

  it("should NOT add stamp to external URLs", () => {
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--stamp",
        "const=42",
        "--assets",
        "./local.js",
        "https://ga.com/foo.js",
        "https://ga.com/foo.js",
        "http://foo.com/bar.css",
        "file://local/file.js",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="http://foo.com/bar.css"></head><body><script src="./local.js?v=42"></script><script src="https://ga.com/foo.js"></script><script src="https://ga.com/foo.js"></script><script src="file://local/file.js"></script></body></html>'
    );
  });

  it("should insert non-local URLs with params as-is", () => {
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--stamp",
        "const=42",
        "--assets",
        "./local.js",
        "https://ga.com/foo.js?p=v",
        "https://ga.com/foo.js?p=v&c",
        "http://foo.com/bar.css?p=v&a=asdf",
        "file://local/file.js?asdf",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="http://foo.com/bar.css?p=v&amp;a=asdf"></head><body><script src="./local.js?v=42"></script><script src="https://ga.com/foo.js?p=v"></script><script src="https://ga.com/foo.js?p=v&amp;c"></script><script src="file://local/file.js?asdf"></script></body></html>'
    );
  });

  it("should support stamping by current timestamp", () => {
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--stamp",
        "now",
        "--assets",
        JS_ASSET_ALERT,
        MJS_ASSET_ANSWER,
        CSS_ASSET_RESET,
        ICO_ASSET_GITHUB,
      ])
    ).toBe(0);

    expect(output).toBe(
      `<html><head><link rel="stylesheet" href="./test/data/assets/reset.css?v=${__NOW}"><link rel="shortcut icon" type="image/ico" href="./test/data/assets/github.ico?v=${__NOW}"></head><body><script src="./test/data/assets/alert.js?v=${__NOW}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${__NOW}"></script></body></html>`
    );
  });

  it("should support stamping with a substring of current timestamp", () => {
    const NOW_5_SUBSET = __NOW.slice(-5);
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--stamp",
        "now=5",
        "--assets",
        JS_ASSET_ALERT,
        MJS_ASSET_ANSWER,
        CSS_ASSET_RESET,
        ICO_ASSET_GITHUB,
      ])
    ).toBe(0);

    expect(output).toBe(
      `<html><head><link rel="stylesheet" href="./test/data/assets/reset.css?v=${NOW_5_SUBSET}"><link rel="shortcut icon" type="image/ico" href="./test/data/assets/github.ico?v=${NOW_5_SUBSET}"></head><body><script src="./test/data/assets/alert.js?v=${NOW_5_SUBSET}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${NOW_5_SUBSET}"></script></body></html>`
    );
  });

  it("should support stamping with a substring of current timestamp via negative length", () => {
    const NOW_5_SUBSET = __NOW.slice(5);
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--stamp",
        "now=-5",
        "--assets",
        JS_ASSET_ALERT,
        MJS_ASSET_ANSWER,
        CSS_ASSET_RESET,
        ICO_ASSET_GITHUB,
      ])
    ).toBe(0);

    expect(output).toBe(
      `<html><head><link rel="stylesheet" href="./test/data/assets/reset.css?v=${NOW_5_SUBSET}"><link rel="shortcut icon" type="image/ico" href="./test/data/assets/github.ico?v=${NOW_5_SUBSET}"></head><body><script src="./test/data/assets/alert.js?v=${NOW_5_SUBSET}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${NOW_5_SUBSET}"></script></body></html>`
    );
  });

  it("should support stamping by file lastmod", () => {
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--stamp",
        "lastmod",
        "--assets",
        JS_ASSET_ALERT,
        MJS_ASSET_ANSWER,
        CSS_ASSET_RESET,
        ICO_ASSET_GITHUB,
      ])
    ).toBe(0);

    expect(/\/reset\.css\?v=\d{13}"/.test(output)).toBeTrue();
    expect(/\/github\.ico\?v=\d{13}"/.test(output)).toBeTrue();
    expect(/\/alert\.js\?v=\d{13}"/.test(output)).toBeTrue();
    expect(/\/answer\.mjs\?v=\d{13}"/.test(output)).toBeTrue();

    expect(output.match(/\/reset\.css\?v=(\d{13})"/)![0]).not.toBe(__NOW);
  });

  it("should support stamping with a substring of file lastmod", () => {
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--stamp",
        "lastmod=5",
        "--assets",
        JS_ASSET_ALERT,
        MJS_ASSET_ANSWER,
        CSS_ASSET_RESET,
        ICO_ASSET_GITHUB,
      ])
    ).toBe(0);

    expect(/\/reset\.css\?v=\d{5}"/.test(output)).toBeTrue();
    expect(/\/github\.ico\?v=\d{5}"/.test(output)).toBeTrue();
    expect(/\/alert\.js\?v=\d{5}"/.test(output)).toBeTrue();
    expect(/\/answer\.mjs\?v=\d{5}"/.test(output)).toBeTrue();
  });

  it("should support stamping by file hash of", () => {
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--stamp",
        "hash",
        "--assets",
        JS_ASSET_ALERT,
        MJS_ASSET_ANSWER,
        CSS_ASSET_RESET,
        ICO_ASSET_GITHUB,
      ])
    ).toBe(0);

    expect(output).toBe(
      `<html><head><link rel="stylesheet" href="./test/data/assets/reset.css?v=${CSS_ASSET_RESET_HASH}"><link rel="shortcut icon" type="image/ico" href="./test/data/assets/github.ico?v=${ICO_ASSET_GITHUB_HASH}"></head><body><script src="./test/data/assets/alert.js?v=${JS_ASSET_ALERT_HASH}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${MJS_ASSET_ANSWER_HASH}"></script></body></html>`
    );
  });

  it("should support stamping with a substring of file hash", () => {
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--stamp",
        "hash=5",
        "--assets",
        JS_ASSET_ALERT,
        MJS_ASSET_ANSWER,
        CSS_ASSET_RESET,
        ICO_ASSET_GITHUB,
      ])
    ).toBe(0);

    expect(output).toBe(
      `<html><head><link rel="stylesheet" href="./test/data/assets/reset.css?v=${CSS_ASSET_RESET_HASH.slice(
        -5
      )}"><link rel="shortcut icon" type="image/ico" href="./test/data/assets/github.ico?v=${ICO_ASSET_GITHUB_HASH.slice(
        -5
      )}"></head><body><script src="./test/data/assets/alert.js?v=${JS_ASSET_ALERT_HASH.slice(
        -5
      )}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${MJS_ASSET_ANSWER_HASH.slice(
        -5
      )}"></script></body></html>`
    );
  });

  it("should fallback to current timestamp when a file can not be found", () => {
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--stamp",
        "hash",
        "--assets",
        CSS_ASSET_RESET,
        "./foo.js",
      ])
    ).toBe(0);
    expect(output).toBe(
      `<html><head><link rel="stylesheet" href="./test/data/assets/reset.css?v=${CSS_ASSET_RESET_HASH}"></head><body><script src="./foo.js?v=${__NOW}"></script></body></html>`
    );
  });

  it("should default to stamping by hash", () => {
    expect(
      stampTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--assets",
        JS_ASSET_ALERT,
        MJS_ASSET_ANSWER,
        CSS_ASSET_RESET,
        ICO_ASSET_GITHUB,
      ])
    ).toBe(0);

    expect(output).toBe(
      `<html><head><link rel="stylesheet" href="./test/data/assets/reset.css?v=${CSS_ASSET_RESET_HASH.slice(
        -8
      )}"><link rel="shortcut icon" type="image/ico" href="./test/data/assets/github.ico?v=${ICO_ASSET_GITHUB_HASH.slice(
        -8
      )}"></head><body><script src="./test/data/assets/alert.js?v=${JS_ASSET_ALERT_HASH.slice(
        -8
      )}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${MJS_ASSET_ANSWER_HASH.slice(
        -8
      )}"></script></body></html>`
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
    ).toThrowError("html-insert-assets: Unknown arg: ./bar");
  });

  it("should throw with multiple --html", () => {
    expect(() =>
      parseArgs(["--out", "foo", "--html", "./foo", "./bar"])
    ).toThrowError("html-insert-assets: Unknown arg: ./bar");
  });

  it("should throw with unknown arg", () => {
    expect(() => parseArgs(["--badparam"])).toThrowError(
      "html-insert-assets: Unknown arg: --badparam"
    );
  });

  it("should throw with no --out and --html", () => {
    expect(() => parseArgs(["--out", "out"])).toThrowError(
      "html-insert-assets: required: --html, --out"
    );
    expect(() => parseArgs(["--html", "in"])).toThrowError(
      "html-insert-assets: required: --html, --out"
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
    const {
      outputFile,
      inputFile,
      assets,
      preloadAssets,
      rootDirs,
    } = parseArgs([
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
      "--preload",
      "./e.js",
      "./f.css",
    ]);

    expect(outputFile).toBe("./out");
    expect(inputFile).toBe("./in");
    expect(assets).toEqual({ js: ["./a.js", "./b.js"] });
    expect(preloadAssets).toEqual({ js: ["./e.js"], css: ["./f.css"] });
    expect(rootDirs).toEqual(["/c/", "/d/"]);
  });

  it("should allow `--param=a b` in addition to `--param a b", () => {
    const {
      outputFile,
      inputFile,
      assets,
      preloadAssets,
      rootDirs,
    } = parseArgs([
      "--out=./out",
      "--html=./in",
      "--assets=./a.js",
      "./b.js",
      "--roots=/c/",
      "/d/",
      "--preload=./e.js",
      "./f.css",
    ]);

    expect(outputFile).toBe("./out");
    expect(inputFile).toBe("./in");
    expect(assets).toEqual({ js: ["./a.js", "./b.js"] });
    expect(preloadAssets).toEqual({ js: ["./e.js"], css: ["./f.css"] });
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
});
