# vDebugger &middot; [![npm](https://img.shields.io/npm/v/vdebugger.svg?style=flat-square)](https://www.npmjs.com/package/vdebugger) [![github-actions](https://img.shields.io/github/actions/workflow/status/wechatjs/vdebugger/coverage.yml?style=flat-square)](https://github.com/wechatjs/vdebugger/actions/workflows/coverage.yml) [![coveralls](https://img.shields.io/coveralls/github/wechatjs/vdebugger.svg?style=flat-square)](https://coveralls.io/github/wechatjs/vdebugger)

**English | [简体中文](./README_CN.md)**

A Front-End JavaScript Breakpoint Debugger.

Make it possible to debug your JavaScript in browser, Node.js, JavaScriptCore or other JavaScript runtimes without any extra supports from host environments. [Try `vDebugger` on playground.](https://jsbin.com/jibezuvohe/edit?js,console)

## Installation

`vDebugger` requires ES2015 for [`Generator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator) support.

Install by NPM:

```bash
$ npm install vdebugger
```

```js
import vDebugger from 'vdebugger';
```

Or, import from CDN:

```html
<script src="https://unpkg.com/vdebugger@latest/dist/vdebugger.js"></script>
<!-- vDebugger will mount at global like window.vDebugger by default -->
```

## Getting Started

```js
import vDebugger from 'vdebugger';

const run = vDebugger.debug(`// here's line 1
let a = 1;
a = 2; // break at line 3 later
a = 3;
a = 4;
console.log(a); // output "4"
`, './test.js');
// the second argument is debuggerId for identifing the script,
// which normally is the script url

vDebugger.setBreakpoint('./test.js', 3); // break at line 3

run();

vDebugger.evaluate('console.log(a)'); // output "1"

vDebugger.resume('stepOver');

vDebugger.evaluate('console.log(a)'); // output "2"

vDebugger.resume(); // output "4"
```

## Pre-Transform

`vDebugger` needs code transform for break, while transforming at runtime by default causes performance loss, and therefore, `vDebugger` provides a method called `transform` for code pre-transform at compilation.

```js
/* ----- Compilation ----- */

// pre-transform at compilation, and pass the result to vDebugger.debug at runtime
import vDebugger from 'vdebugger';

const result = vDebugger.transform(`// here's line 1
let a = 1;
a = 2; // break at line 3 later
a = 3;
a = 4;
console.log(a); // output "4"
`, './test.js');
// the second argument is debuggerId for identifing the script,
// which normally is the script url
```

Pass the transformed `result` to `vDebugger.debug` at runtime.

```js
/* ----- Runtime ----- */

// except for passing the transformed result to vDebugger.debug,
// runtime debugging has no difference from which without pre-transform
import vDebugger from 'vdebugger';

const run = vDebugger.debug(result);
// the result contains debuggerId, so the second argument is optional

vDebugger.setBreakpoint('./test.js', 3); // break at line 3

run();

vDebugger.evaluate('console.log(a)'); // output "1"

vDebugger.resume('stepOver');

vDebugger.evaluate('console.log(a)'); // output "2"

vDebugger.resume(); // output "4"
```

## Development

```bash
$ npm start
```

## Testing

```bash
$ npm test
```

## Documentation

- [API Documentation](./docs/API.md)

## License

[MIT](./LICENSE)
