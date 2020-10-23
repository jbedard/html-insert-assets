# html-insert-assets

## Overview

Insert assets such as scripts, stylesheets and shortcut icons into HTML.

Supports stamping of asset URLs, preloading assets and more fine grained options for specific asset types.

## CLI

### Required

```bash
    --html <file>
        the HTML template to insert assets into

    --out <file>
        the output HTML file path
```

### Scripts

```bash
    --scripts [--async] [--module] [--nomodule] [--attr name=value] <scripts>...
```

Add `<script src="...">` elements to the end of the `<body>` for each script.

Options:

```bash
    --async
        adds the 'async' attribute

    --module
        marks the scripts as es2015 modules using the 'type="module"' attribute

    --nomodule
        marks the scripts as non-es2015 using the 'nomodule' attribute

    --attr name=value
        add custom attributes, can specify multiple name=value pairs
```

By default the script will only include the [src attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-src). If neither `--module` or `--nomodule` are present defaults are determined based on file extension or naming conventions:

* `--module` is assumed on a per-file basis if the file extension is `.mjs` or `.es2015.js`
* `--nomodule` is assumed on a per-file basis if a matching es2015 module file is present

See:

* [async attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-async)
* [type="module" attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type)
* [nomodule fallback attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#Module_fallback)

### Stylesheets

```bash
    --stylesheets [--media value] <stylesheets>...
```

Add `<link rel="styleshsheet" href="...">` to the `<head>` for each stylesheet.

Options:

```bash
    --media value
        add the media query attribute
```

See:

* [media query attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-media)

### Favicon Images

```bash
    --favicons [--rel value] [--sizes value] [--type value] <images>...
```

Add `<link rel="icon" type="..." href="...">` to the `<head>` for eached image.

Options:

```bash
    --rel value
        add the specified 'rel' attribute value, defaults to '"icon"'

    --sizes value
        add the specified 'size' attribute value

    --type value
        add the specified 'type' attribute value
```

By default `rel="icon"` is added and the `type` attribute is determined per-file based on file extension.

See:

* [rel attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-rel)
* [sizes attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-sizes)
* [type attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-type)

### Generic Assets

```bash
    --assets <assets>...
```

Attempts to automatically determine asset types based on file extension and inserts such assets with the default configurations listed above.

* `*.{js,mjs}` for scripts
* `*.css` for stylesheets
* `*.ico` for favicons

### Preloading

```bash
    --preload <assets>...
```

Add `<link rel="preload" href="..." as="...">` for each asset, determining the `as` attributed based on file extension.

Allows [preloading assets](https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content) that your page will need very soon, which you want to start loading early in the page lifecycle.

### Stamping

Adds paramaters to inserted URLs to create [versioned URLs](https://web.dev/http-cache/#versioned-urls), allowing long cache times while busting the cache when resources change.

## Examples

### Basic

Functionality shared across asset types, using `--scripts` for these examples.

Basic relative paths:

```bash
    html-insert-assets
        --html ./index.tmpl.html
        --out ./index.html
        --scripts ./a.js b.js sub/c.js
```

will insert:

```html
    <script src="./a.js"></script>
    <script src="./b.js"></script>
    <script src="./sub/c.js"></script>
```

If the `--out` file is in a separate directory, URLs are relative to that directory

```bash
    html-insert-assets
        --html ./index.tmpl.html
        --out ./sub/index.html
        --scripts ./a.js b.js sub/c.js
```

will insert:

```html
    <script src="../a.js"></script>
    <script src="../b.js"></script>
    <script src="./c.js"></script>
```

Root asset directories to trim and convert to URLs relative to the the `--out` directory

```bash
    html-insert-assets
        --html ./index.tmpl.html
        --out ./index.html
        --root .
        --scripts ./a.js b.js sub/c.js
```

will insert:

```html
    <script src="./a.js"></script>
    <script src="./b.js"></script>
    <script src="./sub/c.js"></script>
```

Root directories of assets (multiple):

```bash
    html-insert-assets
        --html ./index.tmpl.html
        --out ./index.html
        --root sub /abs/path
        --scripts /abs/path/a.js b.js sub/c.js
```

will insert:

```html
    <script src="./a.js"></script>
    <script src="./b.js"></script>
    <script src="./c.js"></script>
```

Root directories of assets (multiple + alternate --out):

```bash
    html-insert-assets
        --html ./index.tmpl.html
        --out ./out/index.html
        --root sub /abs/path
        --scripts /abs/path/a.js b.js sub/c.js
```

will insert:

```html
    <script src="./a.js"></script>
    <script src="../b.js"></script>
    <script src="./c.js"></script>
```

Absolute paths outside any root directories:

```bash
    html-insert-assets
        --html ./index.tmpl.html
        --out sub/index.html
        --root sub /abs/path
        --scripts /path/to/my.js
```

will insert:

```html
    <script src="/path/to/my.js"></script>
```

### Assets

Scripts, auto detecting `type="module"` vs `nomodule`

```bash
    html-insert-assets
        --html ... --out ...
        --scripts foo.mjs foo.js
```

Scripts, manually specifying `type="module"` vs `nomodule`

```bash
    html-insert-assets
        --html ... --out ...
        --scripts --module app.mjs
        --scripts --nomodule app-legacy.js
```

Multiple favicons:

```bash
    html-insert-assets
        --html ... --out ...
        --favicon --sizes=16x16 default.ico
        --favicon --sizes=128x128 large.png
```

Stylesheets:

```bash
    html-insert-assets
        --html ... --out ...
        --stylesheets main.css
        --stylesheets --media=print print-only.css
```

### Preloading Examples

Preloading some .js and .jpg files.

```bash
    html-insert-assets
        --html ./index.tmpl.html
        --out ./index.html
        --preload load-later.js large-image.jpg
```

will insert:

```html
    <link rel="preload" href="./load-later.js" as="script">
    <link rel="preload" href="./large-image.jpg" as="image">
```

## Notes

Originally forked from [rules_nodejs](https://github.com/bazelbuild/rules_nodejs/tree/0.41.0/packages/inject-html).
