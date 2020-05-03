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
```
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
```
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
```
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
```
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
```
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
```
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

Prealoding assets that your page will need soon, which you want to start loading early in the page lifecycle. See https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content for a full description.

Preloading some .js and .jpg files.
```
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

## Notes

Originally forked from https://github.com/bazelbuild/rules_nodejs/tree/0.41.0/packages/inject-html.