# html-insert-assets
Insert assets such as .js, .css into an HTML file.

* .js files inserted at end of <body>
* .css files inserted at end of <head>
* .ico file inserted at end of <head>

## Examples

Examples of functionality shared across asset types use .js for simplicity.

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

## Notes

Originally forked from https://github.com/bazelbuild/rules_nodejs/tree/0.41.0/packages/inject-html.