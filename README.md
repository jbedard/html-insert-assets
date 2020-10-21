# html-insert-assets

## Overview

Insert assets such as .js, .css into an HTML file.

* .js and .mjs files inserted as `<script>` at end of `<body>`
* .css files inserted as `<link rel="stylesheet">` at end of `<head>`
* .ico file inserted as `<link rel="shortcut icon">` at end of `<head>`

Preload assets such as as .js, .css, images (ico, jpg, png, gif) inserted as `<link rel="preload">`

## Examples

### Assets

Functionality shared across asset types using .js assets for simplicity.

Basic relative paths:

```bash
html-insert-assets
    --html ./index.tmpl.html
    --out ./index.html
    --assets ./a.js b.js sub/c.js
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
    --assets ./a.js b.js sub/c.js
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
    --assets ./a.js b.js sub/c.js
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
    --assets /abs/path/a.js b.js sub/c.js
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
    --assets /abs/path/a.js b.js sub/c.js
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
    --assets /path/to/my.js
```

will insert:

```html
    <script src="/path/to/my.js"></script>
```

### Preloading files

Preloading assets that your page will need very soon, which you want to start loading early in the page lifecycle. See https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content for a full description.

Preloading some .js and .jpg files.

```bash
html-insert-assets
    --html ./index.tmpl.html
    --out ./index.html
    --preload load-later.js large-image.jpg
```

will insert:

```html
<link rel="preload" href="./load-later.js">
<link rel="preload" href="./large-image.jpg">
```

### Stamping

Adds paramaters to inserted URLs to fingerprint URLs to allow HTTP caching with reliable cache busting when resources change. See https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching#invalidating_and_updating_cached_responses for a detailed explanation.

## Notes

Originally forked from https://github.com/bazelbuild/rules_nodejs/tree/0.41.0/packages/inject-html.