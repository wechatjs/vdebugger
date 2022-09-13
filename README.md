# vDebugger &middot; [![npm](https://img.shields.io/npm/v/vdebugger.svg?style=flat-square)](https://www.npmjs.com/package/vdebugger) [![github-actions](https://img.shields.io/github/workflow/status/wechatjs/vdebugger/Coverage.svg?style=flat-square)](https://github.com/wechatjs/vdebugger/actions/workflows/coverage.yml) [![coveralls](https://img.shields.io/coveralls/github/wechatjs/vdebugger.svg?style=flat-square)](https://coveralls.io/github/wechatjs/vdebugger)

浏览器端JavaScript断点调试工具。

## 快速开始

```js
import vDebugger from 'vdebugger';

const run = vDebugger.debug(`// 这里是第1行
let a = 1;
a = 2; // 设置断点在第3行
a = 3;
a = 4;
console.log(a); // 输出 4
`, './test.js');

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
// 编译期转换，将转换结果result原封不动的交给运行时的vDebugger.debug接口即可
import vDebugger from 'vdebugger';

const result = vDebugger.transform(`// 这里是第1行
let a = 1;
a = 2; // 设置断点在第3行
a = 3;
a = 4;
console.log(a); // 输出 4
`, './test.js');
```

拿到转换结果 `result` 后，在运行时传入 `vDebugger.debug` 接口。


```js
// 运行时调试，除了将编译结果result传入vDebugger.debug接口，其他用法和没有预编译时保持一致
import vDebugger from 'vdebugger';

const run = vDebugger.debug(result); // result中会带有debuggerId信息，因此第2个参数可不传

vDebugger.setBreakpoint('./test.js', 3); // 设置断点在第3行

run();

vDebugger.evaluate('console.log(a)'); // 输出 1

vDebugger.resume('stepOver');

vDebugger.evaluate('console.log(a)'); // 输出 2

vDebugger.resume(); // 输出 4
```

## 接口文档

### `debug`

调试脚本。接受两个参数，分别是脚本字符串 `script` 和调试ID `debuggerId`。其中，脚本字符串可以是源码，也可以是 `transform` 接口返回的转换结果。而调试ID通常为脚本的URL。调试ID可选，不传时会当作临时脚本，分配随机的调试ID。该接口会返回执行函数 `run`，用于真正地执行脚本，因此可以在 `run` 调用之前使用 `setBreakpoint` 等接口编辑断点设置。当传入参数不合法或者当前环境不支持断点调试的时候，该接口会返回 `false`。

```ts
function debug(script: string, debuggerId?: string): (() => void) | false
```

### `transform`

转换需要调试的脚本。接受两个参数，分别是脚本字符串 `script` 和调试ID `debuggerId`，其中调试ID通常为脚本的URL。调试ID可选，不传时会当作临时脚本，分配随机的调试ID。该接口会返回转换结果，用于运行时传入 `debug` 接口进行调试。当传入参数不合法或者当前环境不支持断点调试的时候，该接口会返回 `false`。

```ts
function transform(script: string, debuggerId?: string): string | false
```

### `resume`

当命中断点暂停时，使用该接口恢复执行。接受一个可选的单步调试参数，可选值为 `stepInto`、`stepOver` 或 `stepOut`：

1. 不传时默认直接继续执行；
2. 传 `stepInto` 时遇到子函数就进入并且继续单步执行；
3. 传 `stepOver` 时遇到子函数时不会进入子函数内单步执行；
4. 传 `stepOut` 时执行完当前函数剩余部分，并返回到上一层函数；

该接口返回的布尔值用于标记是否恢复成功。

```ts
function resume(type?: ResumeType): boolean

type ResumeType = 'stepInto' | 'stepOver' | 'stepOut'
```

### `evaluate`

在特定作用域环境中执行脚本。接受两个参数，分别是脚本字符串 `script` 和调用栈ID `callFrameId`，其中调用栈ID可选，可通过 `getPausedInfo` 接口或 `paused` 事件的断点相关信息中作用域链 `scopeChain` 获取得到。如果传了调用栈ID，将会在对应调用栈的作用域中执行脚本；如果没传，默认在顶层全局作用域中执行脚本。

```ts
function evaluate<Result = unknown>(expression: string, callFrameId?: number): Result | false
```

### `setBreakpoint`

设置断点。接受三个参数，分别是调试ID `debuggerId`、行号 `lineNumber` 和可选条件 `condition`。其中可选条件为一段脚本，当该脚本返回为 `true` 时会中断执行，如果没有条件，则默认到该脚本对应行时都中断执行。如果设置成功，该接口会返回断点信息，包括断点ID `id` 和实际行号 `lineNumber`；如果设置不成功，则返回 `false`。

```ts
function setBreakpoint(debuggerId: string, lineNumber: number, condition?: string): Breakpoint | false

interface Breakpoint { id: number, lineNumber: number }
```

### `removeBreakpoint`

移除断点。接受一个断点ID的参数，返回的布尔值用于标记是否移除成功。

```ts
function removeBreakpoint(id: number): boolean
```

### `setBreakpointsActive`

设置是否启用断点。接受一个布尔值参数，返回的布尔值用于标记设置情况。

```ts
function setBreakpointsActive(value: boolean): boolean
```

### `setExecutionPause`

设置是否暂停执行。接受一个布尔值参数，返回的布尔值用于标记设置情况。设置为 `true` 以后，将在接下来要执行的语句前暂停。

```ts
function setExecutionPause(value: boolean): boolean
```

### `setExceptionPause`

设置在遇到异常时是否暂停执行。接受一个布尔值参数，返回的布尔值用于标记设置情况。设置为 `true` 以后，将在遇到异常时暂停。

```ts
function setExceptionPause(value: boolean): boolean
```

### `getPausedInfo`

获取断点信息。当目前处于暂停状态时，返回的当前断点相关信息，包括调试ID `debuggerId`、断点ID `breakpointId`、行号 `lineNumber`、列号 `columnNumber`、作用域链 `scopeChain` 以及调试源码 `scriptContent`。当目前没有处在暂停状态时，返回 `false`。

其中，作用域链 `scopeChain` 包括全局、函数和块级作用域，可通过是否有调用帧 `callFrame` 字段来判断是否是全局或函数作用域。过滤出作用域链中含有调用帧的作用域，即可获得调用栈。

另外，调用帧 `callFrame` 中的 `callFrameId` 可传给 `evaluate` 接口用于在特定作用域下执行脚本。

```ts
function getPausedInfo(): PausedInfo | false

interface PausedInfo { breakpointId?: number, reason?: string, data?: any, debuggerId: string, lineNumber: number, columnNumber: number, scopeChain: Scope[], scriptContent: string }

interface Scope { eval: (expression: string) => any, name: string, callFrameId: number, callFrame?: CallFrame }

interface CallFrame { debuggerId: string, lineNumber: number, columnNumber: number }
```

### `getScopeChain`

获取当前作用域链。

```ts
function getScopeChain(): Scope[]

interface Scope { eval: (expression: string) => any, name: string, callFrameId: number, callFrame?: CallFrame }

interface CallFrame { debuggerId: string, lineNumber: number, columnNumber: number }
```

### `getScriptContent`

根据调试ID `debuggerId` 获取调试源码。

```ts
function getScriptContent(debuggerId: string): string
```

### `runInNativeEnv`

在原生环境中执行。调试器默认将脚本在内部的沙盒中运行，该接口用于在调试过程中，执行需要在原生环境下运行的代码。如果执行成功，该接口返回值为回调函数的返回值；如果执行失败，返回 `false`。

```ts
function runInNativeEnv(callback: () => Return): Return | false
```

### `runInSkipOver`

跳过断点执行。当命中断点暂停时，如果执行调试脚本，会被阻塞直至断点恢复，该接口用于在暂停情况下，不阻塞直接执行调试脚本，常用于通过 `evaluate` 接口调用调试脚本时，不阻塞执行以获取相应作用域中的值。如果执行成功，该接口返回值为回调函数的返回值；如果执行失败，返回 `false`。

```ts
function runInSkipOver(callback: () => Return): Return | false
```

### `setModuleRequest`

设置模块请求函数。当需要import模块时，内部默认会使用fetch进行请求。如果在不支持fetch的环境使用，或者想自定义模块请求的行为（比如对请求结果进行缓存），可通过该接口进行设置。该接口接受一个请求函数 `request` 作为参数，并返回的布尔值告知是否设置成功。其中，请求函数 `request` 可接受一个模块地址 `importUrl` 作为入参，并要求返回一个 `Promise<string>` 包裹的模块脚本文本内容。而模块脚本文本内容可以是转换前的脚本源码字符串，也可以是通过 `transform` 接口转换后的脚本字符串。

```ts
function setModuleRequest(request: (importUrl: string) => Promise<string>): boolean
```

### `addEventListener` 和 `removeEventListener`

添加或移除事件监听器，接受两个参数，分别是事件 `event` 和监听函数 `listener`。目前有四个事件，为暂停 `paused`、恢复 `resumed`、错误 `error` 和沙盒状态变化 `sandboxchange`。其中，暂停事件会返回断点相关信息，该信息与 `getPausedInfo` 的返回值一致；错误事件会返回错误相关信息，包括错误原因和作用域链；沙盒状态变化事件会返回沙盒相关信息，包括是否启用了沙盒。该接口返回的布尔值用于标记是否添加或移除事件监听器成功。

```ts
function addEventListener<Event extends keyof EventListener>(event: Event, listener: EventListener[Event]): boolean
function removeEventListener<Event extends keyof EventListener>(event: Event, listener: EventListener[Event]): boolean

interface EventListener {
  resumed: () => void,
  paused: (pausedInfo: PausedInfo) => void,
  error: (errorInfo: ErrorInfo) => void,
  sandboxchange: (sandboxInfo: SandboxInfo) => void,
}

interface PausedInfo { breakpointId?: number, reason?: string, data?: any, debuggerId: string, lineNumber: number, columnNumber: number, scopeChain: Scope[], scriptContent: string }

interface ErrorInfo { error: Error, scopeChain: Scope[] }

interface SandboxInfo { enable: boolean }

interface Scope { eval: (expression: string) => any, name: string, callFrameId: number, callFrame?: CallFrame }

interface CallFrame { debuggerId: string, lineNumber: number, columnNumber: number }
```
