# vDebugger &middot; [![npm](https://img.shields.io/npm/v/vdebugger.svg?style=flat-square)](https://www.npmjs.com/package/vdebugger) [![github-actions](https://img.shields.io/github/workflow/status/wechatjs/vdebugger/Coverage.svg?style=flat-square)](https://github.com/wechatjs/vdebugger/actions/workflows/coverage.yml) [![coveralls](https://img.shields.io/coveralls/github/wechatjs/vdebugger.svg?style=flat-square)](https://coveralls.io/github/wechatjs/vdebugger)

**[English](./README.md) | 简体中文**

浏览器端JavaScript断点调试工具。

## 安装

`vDebugger` 需要ES2015的支持，因为使用到了[`Generator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator)。

通过NPM安装:

```bash
$ npm install vdebugger
```

```js
import vDebugger from 'vdebugger';
```

或者通过CDN引入:

```html
<script src="https://unpkg.com/vdebugger@latest/dist/vdebugger.js"></script>
<!-- vDebugger会默认挂载在全局变量上，比如window.vDebugger -->
```

## 快速开始

```js
import vDebugger from 'vdebugger';

const run = vDebugger.debug(`// 这里是第1行
let a = 1;
a = 2; // 设置断点在第3行
a = 3;
a = 4;
console.log(a); // 输出 4
`, './test.js'); // 第二个参数为debuggerId，用于标识脚本，通常为脚本url

vDebugger.setBreakpoint('./test.js', 3); // 设置断点在第3行

run();

vDebugger.evaluate('console.log(a)'); // 输出 1

vDebugger.resume('stepOver');

vDebugger.evaluate('console.log(a)'); // 输出 2

vDebugger.resume(); // 输出 4
```

## 预转换

由于 `vDebugger` 需要对源码进行转换才能进行断点，而默认在运行时转换的话，初始化性能会有一定损失，因此提供了 `transform` 接口进行编译期转换。

```js
// 编译期转换，将转换结果result原封不动地交给运行时的vDebugger.debug接口即可
import vDebugger from 'vdebugger';

const result = vDebugger.transform(`// 这里是第1行
let a = 1;
a = 2; // 设置断点在第3行
a = 3;
a = 4;
console.log(a); // 输出 4
`, './test.js'); // 第二个参数为debuggerId，用于标识脚本，通常为脚本url
```

拿到转换结果 `result` 后，在运行时传入 `vDebugger.debug` 接口。


```js
// 运行时调试，除了将编译结果result传入vDebugger.debug接口，其他用法和没有预编译时保持一致
import vDebugger from 'vdebugger';

const run = vDebugger.debug(result); // result中会带有debuggerId信息，因此第2个参数可选

vDebugger.setBreakpoint('./test.js', 3); // 设置断点在第3行

run();

vDebugger.evaluate('console.log(a)'); // 输出 1

vDebugger.resume('stepOver');

vDebugger.evaluate('console.log(a)'); // 输出 2

vDebugger.resume(); // 输出 4
```

## 文档

- [接口文档](./docs/API_CN.md)

## 协议

[MIT](./LICENSE)
