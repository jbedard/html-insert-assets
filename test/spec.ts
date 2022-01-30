"use strict";

import path = require("path");
import {
  main,
  __parseArgs as parseArgs,
  __NOW,
  __normalizeArgPaths as normalizeArgPaths,
} from "../src/main";

const inFile = "./test/data/index-template.html";
const inFileHTML5 = "./test/data/index-html5-template.html";
const inFileSubdir = "./test/data/subdir/index-template.html";

const JS_ASSET_ALERT = "./test/data/assets/alert.js";
const JS_ASSET_ALERT_HASH = "6yOVKodXSr6FwCnpf6HWhXZl2w"; // original: "6yOVKod/XSr6FwCnpf6HWhXZl2w=";

const MJS_ASSET_ANSWER = "./test/data/assets/answer.mjs";
const MJS_ASSET_ANSWER_HASH = "M2lyTaM7ZJXfwxvnwmsz2vvbk"; // original: "M2lyTaM7ZJXfwxvnwmsz2v+v+bk=";

const ICO_ASSET_GITHUB = "./test/data/assets/github.ico";
const ICO_ASSET_GITHUB_HASH = "B1oibWKIpml3j2X37M3ZZ3CSU"; // original: "B+1oi+bWKIpml3j2X37M3ZZ3CSU=";

const CSS_ASSET_RESET = "./test/data/assets/reset.css";
const CSS_ASSET_RESET_HASH = "D3C2hyvo84Oc7dvX3WUThJ6oUl4"; // original: "D3C2hyvo84Oc7dvX3WUThJ6oUl4=";

let output = "";
function write(_: string, content: string) {
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
    expect(output).toBe(
      "<!DOCTYPE html><html><head></head><body></body></html>"
    );
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
    // Spy to avaoid output during tests
    spyOn(console, "warn");

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

  it("should warn non --strict and unknown asset types", () => {
    const spy = spyOn(console, "warn");

    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      // "--quiet",
      "--assets",
      "foo.x",
      "foo.y",
    ]);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.calls.argsFor(0)[0]).toContain(`Unknown asset usage: foo.x`);
    expect(spy.calls.argsFor(1)[0]).toContain(`Unknown asset usage: foo.y`);
  });

  it("should not warn when --quiet and sourcemap files for .js files found", () => {
    const spy = spyOn(console, "warn");

    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--quiet",
      "--assets",
      "foo.js",
      "foo.js.map",
    ]);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("--assets", () => {
  describe("js assets", () => {
    it("should inject js assets as <script> tags", () => {
      mainTest(["--out", "index.html", "--html", inFile, "--assets", "a.js"]);
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

    it("should inject relative .js as script with absolute path when output subdir and --roots includes subdir", () => {
      expect(
        mainTest([
          "--html",
          process.cwd() + "/" + inFileSubdir,
          "--out",
          process.cwd() + "/out-sub/index.html",
          "--roots",
          ".",
          process.cwd() + "/out-sub",
          "/abs/src",
          "--scripts",
          "bundle/main.js",
        ])
      ).toBe(0);
      expect(output).toBe(scriptHtml("./bundle/main.js"));
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
        // eslint-disable-next-line @typescript-eslint/unbound-method
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
        '<html><head><link rel="icon" href="./a.ico" type="image/ico"><link rel="icon" href="/b.ico" type="image/ico"><link rel="icon" href="./c.ico" type="image/ico"></head><body></body></html>'
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
        '<html><head><link rel="icon" href="./path/to/my.ico" type="image/ico"></head><body></body></html>'
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
        '<html><head><link rel="icon" href="./my.ico" type="image/ico"></head><body></body></html>'
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

  it("should not warn when --quiet and sourcemap files for .js files found", () => {
    const spy = spyOn(console, "warn");

    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--quiet",
      "--assets",
      "foo.js",
      "foo.js.map",
    ]);

    expect(spy).not.toHaveBeenCalled();
  });

  it("should not warn when --quiet and sourcemap files for .mjs files found", () => {
    const spy = spyOn(console, "warn");

    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--quiet",
      "--assets",
      "foo.mjs",
      "foo.mjs.map",
    ]);

    expect(spy).not.toHaveBeenCalled();
  });

  it("should not warn when --quiet and sourcemap files for .css files found", () => {
    const spy = spyOn(console, "warn");

    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--quiet",
      "--assets",
      "foo.css",
      "foo.css.map",
    ]);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("--scripts", () => {
  // default behavior, essentially the same as passing .js/mjs to --assets
  describe("basic assets", () => {
    it("should inject js scripts as <script> tags", () => {
      mainTest(["--out", "index.html", "--html", inFile, "--scripts", "a.js"]);
      expect(output).toMatch(/<script.*\.\/a\.js/);
    });

    it("should inject js scripts as <script> tags with html5 template", () => {
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFileHTML5,
        "--scripts",
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
        "--scripts",
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
          "--scripts",
          "./path/to/my.js",
        ])
      ).toBe(0);
      expect(output).toBe(scriptHtml("./path/to/my.js"));
    });

    it("should inject .js as script tag when --scripts= is used", () => {
      expect(
        mainTest([
          "--out",
          "index.html",
          "--html",
          inFile,
          "--scripts=path/to/my.js",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
          "--scripts",
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
        // eslint-disable-next-line @typescript-eslint/unbound-method
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
          "--scripts",
          "external/npm/node_modules/zone.js/dist/zone.min.js",
        ])
      ).toBe(0);
      expect(output).toBe(scriptHtml("./zone.min.js"));
    });
  });

  describe("modules", () => {
    it("should throw if both --module and --nomodule specified", () => {
      expect(() =>
        mainTest([
          "--out",
          "index.html",
          "--html",
          inFile,
          "--scripts",
          "--module",
          "--nomodule",
          "a.js",
        ])
      ).toThrow();
    });

    describe("auto", () => {
      it('should assume "module js" .mjs extension is type="module"', () => {
        expect(
          mainTest([
            "--out",
            "index.html",
            "--html",
            inFile,
            "--scripts",
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
            "--scripts",
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
            "--scripts",
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
            "--scripts",
            "path/to/my.js",
            "path/to/my.mjs",
          ])
        ).toBe(0);
        expect(output).toBe(
          '<html><head></head><body><script nomodule="" src="./path/to/my.js"></script><script type="module" src="./path/to/my.mjs"></script></body></html>'
        );
      });
    });

    describe("--[no]module", () => {
      it("should add type='module' when --module specified", () => {
        mainTest([
          "--out",
          "index.html",
          "--html",
          inFile,
          "--scripts",
          "--module",
          "a.js",
        ]);
        expect(output).toBe(
          '<html><head></head><body><script type="module" src="./a.js"></script></body></html>'
        );
      });

      it("should add nomodule attribute when --nomodule specified", () => {
        mainTest([
          "--out",
          "index.html",
          "--html",
          inFile,
          "--scripts",
          "--nomodule",
          "a.js",
        ]);
        expect(output).toBe(
          '<html><head></head><body><script nomodule="" src="./a.js"></script></body></html>'
        );
      });

      it("should add nomodule attribute when --nomodule specified even with .mjs", () => {
        mainTest([
          "--out",
          "index.html",
          "--html",
          inFile,
          "--scripts",
          "--nomodule",
          "a.mjs",
        ]);
        expect(output).toBe(
          '<html><head></head><body><script nomodule="" src="./a.mjs"></script></body></html>'
        );
      });

      it("should add nomodule attribute when --nomodule specified even with .es2015.js", () => {
        mainTest([
          "--out",
          "index.html",
          "--html",
          inFile,
          "--scripts",
          "--nomodule",
          "a.es2015.js",
        ]);
        expect(output).toBe(
          '<html><head></head><body><script nomodule="" src="./a.es2015.js"></script></body></html>'
        );
      });
    });
  });

  it("should add async attribute when --async specified", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--scripts",
      "--async",
      "a.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js" async=""></script></body></html>'
    );
  });

  it("should allow adding arbitrary attributes using --attr", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--scripts",
      "--attr",
      "foo=bar",
      "a.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js" foo="bar"></script></body></html>'
    );
  });

  it("should allow adding multiple arbitrary attributes using --attr", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--scripts",
      "--attr",
      "foo=bar",
      "baz=biz",
      "a.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js" foo="bar" baz="biz"></script></body></html>'
    );
  });

  it("should allow adding attributes such as crossorigin", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--scripts",
      "--attr",
      "crossorigin=use-credentials",
      "a.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js" crossorigin="use-credentials"></script></body></html>'
    );
  });

  it("should allow adding multiple attributes using --attr", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--scripts",
      "--attr",
      "foo=bar",
      "--attr",
      "asd=fgh",
      "a.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js" foo="bar" asd="fgh"></script></body></html>'
    );
  });

  it("should support multiple sets of --scripts args for different configurations", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--scripts",
      "--attr",
      "foo=1",
      "a.js",
      "--scripts",
      "--async",
      "b.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js" foo="1"></script><script src="./b.js" async=""></script></body></html>'
    );
  });

  it("should support mixing --scripts and --assets while maintaing order of scripts (assets, scripts)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--assets",
      "a.js",
      "--scripts",
      "b.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js"></script><script src="./b.js"></script></body></html>'
    );
  });

  it("should support mixing --scripts and --assets while maintaing order of scripts (scripts, assets)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--scripts",
      "a.js",
      "--assets",
      "b.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js"></script><script src="./b.js"></script></body></html>'
    );
  });

  it("should support mixing --scripts and --assets while maintaing order of scripts (scripts, assets, scripts)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--scripts",
      "a.js",
      "--assets",
      "b.js",
      "--scripts",
      "c.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js"></script><script src="./b.js"></script><script src="./c.js"></script></body></html>'
    );
  });

  it("should support mixing --scripts and --assets while maintaing order of scripts (assets, scripts, assets)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--assets",
      "a.js",
      "--scripts",
      "b.js",
      "--assets",
      "c.js",
    ]);
    expect(output).toBe(
      '<html><head></head><body><script src="./a.js"></script><script src="./b.js"></script><script src="./c.js"></script></body></html>'
    );
  });

  it("should not warn when --quiet and sourcemap files for .js files found", () => {
    const spy = spyOn(console, "warn");

    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--quiet",
      "--scripts",
      "foo.js",
      "foo.js.map",
    ]);

    expect(spy).not.toHaveBeenCalled();
  });

  it("should not warn when --quiet and sourcemap files for .mjs files found", () => {
    const spy = spyOn(console, "warn");

    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--quiet",
      "--scripts",
      "foo.mjs",
      "foo.mjs.map",
    ]);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("--favicons", () => {
  it("should ensure favicon asset paths start with a absolute or relative indicator", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--favicons",
      "./a.ico",
      "/b.ico",
      "c.ico",
    ]);
    expect(output).toBe(
      '<html><head><link rel="icon" href="./a.ico" type="image/ico"><link rel="icon" href="/b.ico" type="image/ico"><link rel="icon" href="./c.ico" type="image/ico"></head><body></body></html>'
    );
  });

  it("should inject .ico files as icon link tags", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--favicons",
        "path/to/my.ico",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="icon" href="./path/to/my.ico" type="image/ico"></head><body></body></html>'
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
        "--favicons",
        "path/to/my.ico",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="icon" href="./my.ico" type="image/ico"></head><body></body></html>'
    );
  });

  it("should default favicon type based on file extension", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--favicons",
      "./a.ico",
      "/b.png",
      "c.svg",
    ]);
    expect(output).toBe(
      '<html><head><link rel="icon" href="./a.ico" type="image/ico"><link rel="icon" href="/b.png" type="image/png"><link rel="icon" href="./c.svg" type="image/svg+xml"></head><body></body></html>'
    );
  });

  it("should set custom rel attribute with --rel", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--favicons",
      "--rel=apple-touch-icon",
      "./a.ico",
      "/b.png",
    ]);
    expect(output).toBe(
      '<html><head><link rel="apple-touch-icon" href="./a.ico" type="image/ico"><link rel="apple-touch-icon" href="/b.png" type="image/png"></head><body></body></html>'
    );
  });

  it("should set custom type attribute with --type", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--favicons",
      "--type=image/foo",
      "./a.ico",
      "/b.png",
    ]);
    expect(output).toBe(
      '<html><head><link rel="icon" href="./a.ico" type="image/foo"><link rel="icon" href="/b.png" type="image/foo"></head><body></body></html>'
    );
  });

  it("should set sizes attribute with --sizes", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--favicons",
      "--sizes=192x192",
      "./a.ico",
      "/b.png",
    ]);
    expect(output).toBe(
      '<html><head><link rel="icon" href="./a.ico" type="image/ico" sizes="192x192"><link rel="icon" href="/b.png" type="image/png" sizes="192x192"></head><body></body></html>'
    );
  });

  it("should accept multiple --favicons sets with different configs", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--favicons",
      "--sizes=192x192",
      "./a.ico",
      "--favicons",
      "--sizes=123x456",
      "--rel=apple-touch-icon",
      "/b.png",
    ]);
    expect(output).toBe(
      '<html><head><link rel="icon" href="./a.ico" type="image/ico" sizes="192x192"><link rel="apple-touch-icon" href="/b.png" type="image/png" sizes="123x456"></head><body></body></html>'
    );
  });

  it("should support mixing --favicons and --assets while maintaing order of favicons (favicons, assets)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--favicons",
      "./a.ico",
      "--assets",
      "./b.ico",
    ]);
    expect(output).toBe(
      '<html><head><link rel="icon" href="./a.ico" type="image/ico"><link rel="icon" href="./b.ico" type="image/ico"></head><body></body></html>'
    );
  });

  it("should support mixing --favicons and --assets while maintaing order of favicons (assets, favicons)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--assets",
      "./a.ico",
      "--favicons",
      "./b.ico",
    ]);
    expect(output).toBe(
      '<html><head><link rel="icon" href="./a.ico" type="image/ico"><link rel="icon" href="./b.ico" type="image/ico"></head><body></body></html>'
    );
  });

  it("should support mixing --favicons and --assets while maintaing order of favicons (favicons, assets, favicons)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--favicons",
      "./a.ico",
      "--assets",
      "./b.ico",
      "--favicons",
      "./c.ico",
    ]);
    expect(output).toBe(
      '<html><head><link rel="icon" href="./a.ico" type="image/ico"><link rel="icon" href="./b.ico" type="image/ico"><link rel="icon" href="./c.ico" type="image/ico"></head><body></body></html>'
    );
  });

  it("should support mixing --favicons and --assets while maintaing order of favicons (assets, favicons, assets)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--assets",
      "./a.ico",
      "--favicons",
      "./b.ico",
      "--assets",
      "./c.ico",
    ]);
    expect(output).toBe(
      '<html><head><link rel="icon" href="./a.ico" type="image/ico"><link rel="icon" href="./b.ico" type="image/ico"><link rel="icon" href="./c.ico" type="image/ico"></head><body></body></html>'
    );
  });
});

describe("--stylesheets", () => {
  it("should ensure css asset paths start with a absolute or relative indicator", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--stylesheets",
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
        "--stylesheets",
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
        "--stylesheets",
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
        "--stylesheets=path/to/my.css",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./path/to/my.css"></head><body></body></html>'
    );
  });

  it("should support media attributes", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--stylesheets",
      "--media=print",
      "./a.css",
    ]);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./a.css" media="print"></head><body></body></html>'
    );
  });

  it("should support media attributes with spaces", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--stylesheets",
      "--media",
      "screen and (max-width: 600px)",
      "./a.css",
    ]);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./a.css" media="screen and (max-width: 600px)"></head><body></body></html>'
    );
  });

  it("should support multiple --stylesheets sets with different configs", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--stylesheets",
      "--media=print",
      "./a.css",
      "--stylesheets",
      "--media",
      "screen and (max-width: 600px)",
      "./b.css",
    ]);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./a.css" media="print"><link rel="stylesheet" href="./b.css" media="screen and (max-width: 600px)"></head><body></body></html>'
    );
  });

  it("should support mixing --stylesheets and --assets while maintaing order of stylesheets (stylesheets, assets)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--stylesheets",
      "./a.css",
      "--assets",
      "./b.css",
    ]);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./a.css"><link rel="stylesheet" href="./b.css"></head><body></body></html>'
    );
  });

  it("should support mixing --stylesheets and --assets while maintaing order of stylesheets (assets, stylesheets)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--assets",
      "./a.css",
      "--stylesheets",
      "./b.css",
    ]);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./a.css"><link rel="stylesheet" href="./b.css"></head><body></body></html>'
    );
  });

  it("should support mixing --stylesheets and --assets while maintaing order of stylesheets (assets, stylesheets, assets)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--assets",
      "./a.css",
      "--stylesheets",
      "./b.css",
      "--assets",
      "./c.css",
    ]);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./a.css"><link rel="stylesheet" href="./b.css"><link rel="stylesheet" href="./c.css"></head><body></body></html>'
    );
  });

  it("should support mixing --stylesheets and --assets while maintaing order of stylesheets (stylesheets, assets, stylesheets)", () => {
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--stylesheets",
      "./a.css",
      "--assets",
      "./b.css",
      "--stylesheets",
      "./c.css",
    ]);
    expect(output).toBe(
      '<html><head><link rel="stylesheet" href="./a.css"><link rel="stylesheet" href="./b.css"><link rel="stylesheet" href="./c.css"></head><body></body></html>'
    );
  });

  it("should not warn when --quiet and sourcemap files for .mjs files found", () => {
    const spy = spyOn(console, "warn");

    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--quiet",
      "--stylesheets",
      "foo.css",
      "foo.css.map",
    ]);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("--manifest", () => {
  it("should inject PWA manifest files as manifest link tags", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--manifest",
        "./manifest.webmanifest",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="manifest" href="./manifest.webmanifest"></head><body></body></html>'
    );
  });

  it("should ensure manifest paths start with a absolute or relative indicator", () => {
    // relative
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--manifest",
      "./a.json",
    ]);
    expect(output).toBe(
      '<html><head><link rel="manifest" href="./a.json"></head><body></body></html>'
    );

    // Absolute
    mainTest([
      "--out",
      "index.html",
      "--html",
      inFile,
      "--manifest",
      "/b.json",
    ]);
    expect(output).toBe(
      '<html><head><link rel="manifest" href="/b.json"></head><body></body></html>'
    );

    // No prefix => relative
    mainTest(["--out", "index.html", "--html", inFile, "--manifest", "c.json"]);
    expect(output).toBe(
      '<html><head><link rel="manifest" href="./c.json"></head><body></body></html>'
    );
  });

  it("should strip the longest matching prefix for manifest files", () => {
    expect(
      mainTest([
        "--out",
        "index.html",
        "--html",
        inFile,
        "--roots",
        "path",
        "path/to",
        "--manifest",
        "path/to/manifest.json",
      ])
    ).toBe(0);
    expect(output).toBe(
      '<html><head><link rel="manifest" href="./manifest.json"></head><body></body></html>'
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
      '<html><head><link rel="stylesheet" href="./path/to/my.css"><link rel="preload" href="./path/to/my.css" as="style"></head><body></body></html>'
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
    // Spy to avaoid output during tests
    spyOn(console, "warn");

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
      '<html><head><link rel="stylesheet" href="./style.css?v=42"><link rel="icon" href="./favicon.ico?v=42" type="image/ico"></head><body><script src="./script.js?v=42"></script><script type="module" src="./script-module.mjs?v=42"></script></body></html>'
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
      `<html><head><link rel="stylesheet" href="./test/data/assets/reset.css?v=${__NOW}"><link rel="icon" href="./test/data/assets/github.ico?v=${__NOW}" type="image/ico"></head><body><script src="./test/data/assets/alert.js?v=${__NOW}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${__NOW}"></script></body></html>`
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
      `<html><head><link rel="stylesheet" href="./test/data/assets/reset.css?v=${NOW_5_SUBSET}"><link rel="icon" href="./test/data/assets/github.ico?v=${NOW_5_SUBSET}" type="image/ico"></head><body><script src="./test/data/assets/alert.js?v=${NOW_5_SUBSET}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${NOW_5_SUBSET}"></script></body></html>`
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
      `<html><head><link rel="stylesheet" href="./test/data/assets/reset.css?v=${NOW_5_SUBSET}"><link rel="icon" href="./test/data/assets/github.ico?v=${NOW_5_SUBSET}" type="image/ico"></head><body><script src="./test/data/assets/alert.js?v=${NOW_5_SUBSET}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${NOW_5_SUBSET}"></script></body></html>`
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

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      `<html><head><link rel="stylesheet" href="./test/data/assets/reset.css?v=${CSS_ASSET_RESET_HASH}"><link rel="icon" href="./test/data/assets/github.ico?v=${ICO_ASSET_GITHUB_HASH}" type="image/ico"></head><body><script src="./test/data/assets/alert.js?v=${JS_ASSET_ALERT_HASH}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${MJS_ASSET_ANSWER_HASH}"></script></body></html>`
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
      )}"><link rel="icon" href="./test/data/assets/github.ico?v=${ICO_ASSET_GITHUB_HASH.slice(
        -5
      )}" type="image/ico"></head><body><script src="./test/data/assets/alert.js?v=${JS_ASSET_ALERT_HASH.slice(
        -5
      )}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${MJS_ASSET_ANSWER_HASH.slice(
        -5
      )}"></script></body></html>`
    );
  });

  it("should fallback to current timestamp when a file can not be found", () => {
    // Spy to avaoid output during tests
    spyOn(console, "warn");

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
      )}"><link rel="icon" href="./test/data/assets/github.ico?v=${ICO_ASSET_GITHUB_HASH.slice(
        -8
      )}" type="image/ico"></head><body><script src="./test/data/assets/alert.js?v=${JS_ASSET_ALERT_HASH.slice(
        -8
      )}"></script><script type="module" src="./test/data/assets/answer.mjs?v=${MJS_ASSET_ANSWER_HASH.slice(
        -8
      )}"></script></body></html>`
    );
  });
});

describe("parseArgs", () => {
  const REQUIRE_PARAMS = ["--out", "foo.html", "--html", "in.html"];

  function pluckUri({ uri }: { uri: string }) {
    return uri;
  }

  it("should accept a single --out and --html", () => {
    const { outputFile: inputOutputFile, inputFile: inputInputFile } =
      parseArgs(["--out", "./foo.html", "--html", "index.html"]);

    const { inputFile, outputFile } = normalizeArgPaths(
      [],
      inputInputFile,
      inputOutputFile
    );

    expect(outputFile).toBe("./foo.html");
    expect(inputFile).toBe("./index.html");
  });

  it("should throw with multiple --out values", () => {
    expect(() =>
      parseArgs(["--html", "validhtml", "--out", "./foo", "./bar"])
    ).toThrowError("Unknown arg: ./bar");
  });

  it("should throw with multiple --out params", () => {
    expect(() =>
      parseArgs(["--html", "validhtml", "--out", "./foo", "--out", "./bar"])
    ).toThrowError("Duplicate arg: --out");
  });

  it("should throw with multiple --html values", () => {
    expect(() =>
      parseArgs(["--out", "foo", "--html", "./foo", "./bar"])
    ).toThrowError("Unknown arg: ./bar");
  });

  it("should throw with multiple --html params", () => {
    expect(() =>
      parseArgs(["--out", "foo", "--html", "./foo", "--html", "./bar"])
    ).toThrowError("Duplicate arg: --html");
  });

  it("should throw with unknown arg", () => {
    expect(() => parseArgs([...REQUIRE_PARAMS, "--badparam"])).toThrowError(
      "Unknown arg: --badparam"
    );
  });

  it("should throw with no --out and --html params", () => {
    expect(() => parseArgs(["--out", "out"])).toThrowError(
      "Required arguments: --html, --out"
    );
    expect(() => parseArgs(["--html", "in"])).toThrowError(
      "Required arguments: --html, --out"
    );
    expect(() => parseArgs([])).toThrowError(
      "Required arguments: --html, --out"
    );
  });

  it("should not throw when --help specified", () => {
    expect(parseArgs(["--help"]).help).toBeTrue();
    expect(parseArgs(["--help", "--out", "out"]).help).toBeTrue();
    expect(parseArgs(["--help", "--html", "in"]).help).toBeTrue();
  });

  it("should throw when multiple --manifest specified", () => {
    expect(() =>
      parseArgs([
        ...REQUIRE_PARAMS,
        "--manifest",
        "a.json",
        "--manifest",
        "b.json",
      ])
    ).toThrowError("Duplicate arg: --manifest");
  });

  it("should throw when multiple --stamp specified", () => {
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--stamp", "--stamp"])
    ).toThrowError("Duplicate arg: --stamp");
  });

  it("should throw when multiple --stamp with different configs specified", () => {
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--stamp=none", "--stamp=hash"])
    ).toThrowError("Duplicate arg: --stamp");

    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--stamp", "none", "--stamp=hash"])
    ).toThrowError("Duplicate arg: --stamp");
  });

  it("should throw for required args before duplicate args", () => {
    expect(() => parseArgs(["--stamp", "--stamp"])).toThrowError(
      "Required arguments: --html, --out"
    );

    expect(() =>
      parseArgs(["--stamp", "--html", "foo", "--stamp"])
    ).toThrowError("Required arguments: --html, --out");

    expect(() =>
      parseArgs(["--stamp", "--stamp", "--html", "foo"])
    ).toThrowError("Required arguments: --html, --out");
  });

  it("should normalize roots paths", () => {
    const { rootDirs: inputRootDirs } = parseArgs([
      ...REQUIRE_PARAMS,
      "--roots",
      "./b/../a/",
      "./././b",
    ]);

    const { rootDirs } = normalizeArgPaths(inputRootDirs, "", "");

    expect(rootDirs).toEqual(["./a/", "./b/"]);
  });

  it("should ensure root paths end with a /", () => {
    const { rootDirs: inputRootDirs } = parseArgs([
      ...REQUIRE_PARAMS,
      "--roots",
      "../a",
      "./b",
      "c",
      "/d",
    ]);

    const { rootDirs } = normalizeArgPaths(inputRootDirs, "", "");

    expect(rootDirs).toEqual(["../a/", "./b/", "./c/", "/d/"]);
  });

  it("should ensure root paths start with a absolute or relative indicator", () => {
    const { rootDirs: inputRootDirs } = parseArgs([
      ...REQUIRE_PARAMS,
      "--roots",
      "./a/",
      "b/",
      "/c/",
    ]);

    const { rootDirs } = normalizeArgPaths(inputRootDirs, "", "");

    expect(rootDirs).toEqual(["./a/", "./b/", "/c/"]);
  });

  it("should throw when multiple --roots specified", () => {
    expect(() =>
      parseArgs([...REQUIRE_PARAMS, "--roots", "a", "--roots", "b"])
    ).toThrowError("Duplicate arg: --roots");
  });

  it("should accept no assets arg", () => {
    const { assets } = parseArgs([...REQUIRE_PARAMS]);

    expect(assets).toEqual([]);
  });

  it("should accept empty roots", () => {
    expect(() => parseArgs([...REQUIRE_PARAMS, "--roots"])).not.toThrow();
  });

  it("should accept no roots arg", () => {
    expect(() => parseArgs([...REQUIRE_PARAMS])).not.toThrow();
  });

  it("should accept multiple roots", () => {
    const { rootDirs: inputRootDirs } = parseArgs([
      ...REQUIRE_PARAMS,
      "--roots",
      "./a/",
      "../b/",
      "/abs/path/",
    ]);

    const { rootDirs } = normalizeArgPaths(inputRootDirs, "", "");

    expect(rootDirs).toEqual([`/abs/path/`, `../b/`, `./a/`]);
  });

  it("should sort roots by specificity", () => {
    const { rootDirs: inputRootDirs } = parseArgs([
      ...REQUIRE_PARAMS,
      "--roots",
      "./a/",
      "./a/b/",
      "../b/",
      "/abs/path/",
      "/abs/path/b/",
    ]);

    const { rootDirs } = normalizeArgPaths(inputRootDirs, "", "");

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
      outputFile: inputOutputFile,
      inputFile: inputInputFile,
      assets,
      rootDirs: inputRootDirs,
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

    const { rootDirs, inputFile, outputFile } = normalizeArgPaths(
      inputRootDirs,
      inputInputFile,
      inputOutputFile
    );

    expect(outputFile).toBe("./out");
    expect(inputFile).toBe("./in");
    expect(assets.map(pluckUri)).toEqual([
      "./a.js",
      "./b.js",
      "./e.js",
      "./f.css",
    ]);
    expect(rootDirs).toEqual(["/c/", "/d/"]);
  });

  it("should allow `--param=a b` in addition to `--param a b", () => {
    const {
      outputFile: inputOutputFile,
      inputFile: inputInputFile,
      assets,
      rootDirs: inputRootDirs,
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

    const { rootDirs, inputFile, outputFile } = normalizeArgPaths(
      inputRootDirs,
      inputInputFile,
      inputOutputFile
    );

    expect(outputFile).toBe("./out");
    expect(inputFile).toBe("./in");
    expect(assets.map(pluckUri)).toEqual([
      "./a.js",
      "./b.js",
      "./e.js",
      "./f.css",
    ]);
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
    expect(assets.map(pluckUri)).toEqual([
      "./a.js",
      "./b.js",
      "./b.css",
      "./c.ico",
    ]);
  });

  describe("--scripts", () => {
    it("should throw for --scripts with no files listed followed by additional params", () => {
      expect(() =>
        parseArgs([...REQUIRE_PARAMS, "--scripts", "--hash"])
      ).toThrow();
    });

    it("shoudl NOT throw when --scripts and valid files passed as the last arg", () => {
      expect(() =>
        parseArgs([...REQUIRE_PARAMS, "--scripts", "foo.js"])
      ).not.toThrow();
    });
  });
});
