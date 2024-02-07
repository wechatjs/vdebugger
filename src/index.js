import { addEventListener, removeEventListener, emitEventListener, getPropertyDescriptor, emptyYield, getImportUrl } from './utils';
import { EXECUTOR_BREAK_NAME, CLASS_CONSTRUCTOR_NAME, PROXY_MARK } from './consts';
import { wrapProtoMethod, switchObjectMethod, switchGlobalObject } from './sandbox';
import { version } from '../package.json';
import Transformer from './transformer';
import Scope from './scope';

const TRANSFORMED_MARK = '/** VDEBUGGER_TRANSFORMED */';
const nativeEval = typeof eval !== 'undefined' ? eval : false;
const nativeFetch = typeof fetch !== 'undefined' ? fetch : false;
const nativePromise = Promise;

const transformerMap = new Map();
const moduleMap = new Map();
const macroTaskList = [];
let pause = 0; // 0不暂停; 1下次执行暂停; 2异常时暂停
let skip = false;
let active = true;
let sandbox = false;
let supported = true;
let pausedInfo = null;
let resumeOptions = null;
let resumeExecutor = null;
let currentBreaker = null;
let moduleRequest = (importUrl) => nativeFetch(importUrl).then((res) => res.text());

if (!nativeEval) {
  supported = false;
}
try { nativeEval('function*t(){}') } catch (err) {
  supported = false;
}

/**
 * 中断标识，用于执行器判断是否需要中断
 * @param {Array} args 检查参数
 */
function breaker(...args) {
  return { [EXECUTOR_BREAK_NAME]: args };
}

/**
 * 判断当前值是否是中断标识
 * @param {Any} value 当前值
 */
function isBreaker(value) {
  try {
    // 之所以要包一层try catch，是因为value有可能是iframe.contentWindow，直接获取的时候会导致跨域报错
    return value?.[EXECUTOR_BREAK_NAME]?.length;
  } catch (err) {
    return false;
  }
}

/**
 * 用于内部检查是否需要中断执行
 * @param {String} debuggerId 调试id，通常为脚本的url
 * @param {Number} breakpointId 断点id
 * @param {Number} lineNumber 断点行号
 * @param {Number} columnNumber 断点列号
 * @param {Boolean} scopeBlocker 是否为作用域阻塞执行的断点
 */
function checkIfBreak(debuggerId, breakpointId, lineNumber, columnNumber, scopeBlocker) {
  if (!skip) {
    if (scopeBlocker) {
      // 如果是作用域阻塞执行的断点，且目前命中了断点，暂停执行
      if (resumeExecutor) {
        return breaker(debuggerId, breakpointId, lineNumber, columnNumber, scopeBlocker);
      }
      // 否则就继续执行
      return;
    } else {
      // 否则记录一下调用帧信息
      Scope.updateCallFrame({ debuggerId, lineNumber, columnNumber });
    }
    if (pause === 1) {
      // 如果被手动暂停了，那就直接当成命中断点处理
      pause = 0;
    } else {
      if (!active) {
        // 如果当前禁用了断点，那么继续执行
        return;
      }
      const condition = Transformer.breakpointMap.get(breakpointId);
      if (!condition && ['stepInto', 'stepOver', 'stepOut'].indexOf(resumeOptions?.type) === -1) {
        // 如果没有命中断点，并且不是单步调试，那么继续执行
        return;
      }
      const callFrameId = Scope.getCurrentCallFrameId();
      if (resumeOptions?.type === 'stepOver' && resumeOptions?.callFrameId < callFrameId) {
        // 如果是跳过当前函数，但进入到子函数了，那么继续执行
        return;
      }
      if (resumeOptions?.type === 'stepOut' && resumeOptions?.callFrameId <= callFrameId) {
        // 如果是跳出当前函数，但仍在函数内，那么继续执行
        return;
      }
      if (typeof condition === 'string') {
        // 对于条件断点和日志断点，执行一下表达式，再判断是否需要中断
        const conditionRes = evaluate(condition, callFrameId);
        if (!conditionRes || condition.startsWith('/** DEVTOOLS_LOGPOINT */')) {
          return;
        }
      }
    }
    // 否则，就是命中断点，中断执行
    return breaker(debuggerId, breakpointId, lineNumber, columnNumber);
  }
}

/**
 * 启用沙盒环境
 */
function enableSandbox(enable) {
  if (enable) {
    wrapProtoMethod(executor);
  }
  if (sandbox !== !!enable) {
    sandbox = !!enable;
    switchObjectMethod(Array, ['from', 'fromAsync', 'of', 'isArray']);
    switchObjectMethod(String, ['fromCharCode', 'fromCharPoint', 'raw']);
    switchObjectMethod(Object, [
      'assign', 'create', 'defineProperties', 'defineProperty', 'entries', 'freeze', 'fromEntries',
      'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors', 'getOwnPropertyNames', 'getOwnPropertySymbols',
      'getPrototypeOf', 'groupBy', 'hasOwn', 'is', 'isExtensible', 'isFrozen', 'isSealed', 'keys', 'preventExtensions',
      'seal', 'setPrototypeOf', 'values'
    ]);
    switchObjectMethod(RegExp.prototype, [Symbol.replace]);
    switchObjectMethod(Object.prototype, ['hasOwnProperty', 'propertyIsEnumerable', 'valueOf']);
    switchObjectMethod(Array.prototype, [
      'at', 'concat', 'copyWithin', 'entries', 'every', 'fill', 'filter', 'find', 'findIndex',
      'findLast', 'findLastIndex', 'flat', 'flatMap', 'forEach', 'includes', 'indexOf', 'join',
      'keys', 'lastIndexOf', 'map', 'pop', 'push', 'reduce', 'reduceRight', 'reverse', 'shift',
      'slice', 'some', 'sort', 'splice', 'toLocaleString', 'toString', 'unshift', 'values'
    ]);
    switchObjectMethod(String.prototype, [
      'anchor', 'at', 'big', 'blink', 'bold', 'charAt', 'charCodeAt', 'codePointAt', 'concat', 'endsWith',
      'fixed', 'fontcolor', 'fontsize', 'includes', 'indexOf', 'italics', 'lastIndexOf', 'link', 'localeCompare',
      'match', 'matchAll', 'normalize', 'padEnd', 'padStart', 'repeat', 'replace', 'replaceAll', 'search',
      'slice', 'small', 'split', 'startsWith', 'strike', 'sub', 'substr', 'substring', 'sup', 'toLocaleLowerCase',
      'toLocaleUpperCase', 'toLowerCase', 'toString', 'toUpperCase', 'trim', 'trimEnd', 'trimLeft', 'trimRight',
      'trimStart', 'valueOf'
    ]);
    switchGlobalObject();
    emitEventListener('sandboxchange', { enable: sandbox });
  }
}

/**
 * 执行宏任务队列中下一个任务
 */
function executeNextMacroTask() {
  enableSandbox(false);
  if (macroTaskList.length) {
    // 当前脚本执行完毕，如果宏任务队列中有需要恢复执行的任务，取出并执行
    const nextMacroTask = macroTaskList.shift();
    nextMacroTask();
  }
}

/**
 * 执行器，控制协程执行
 * @param {Generator} generator 需要执行generator
 * @param {Object} result yield返回值，用于返回恢复执行的值
 */
function executor(generator, result) {
  enableSandbox(true);
  const breakerResolved = (value) => executor(generator, { value, done: false });
  const breakerCatched = (err) => { scope(false); throw err };
  let ret = result || emptyYield();
  while (!ret.done) {
    if (!skip) {
      if (isBreaker(ret.value) && typeof ret.value[EXECUTOR_BREAK_NAME][0].then === 'function') {
        // 如果是promise，中断执行，等resolve后继续执行
        const nextBreaker = breaker(ret.value[EXECUTOR_BREAK_NAME][0].then(breakerResolved).catch(breakerCatched));
        // 如果这个breaker是断点，记录全局当前断点记录
        if (ret.value[EXECUTOR_BREAK_NAME][1]) {
          nextBreaker[EXECUTOR_BREAK_NAME].push(1);
          currentBreaker = nextBreaker;
        }
        return nextBreaker;
      }
      if (isBreaker(currentBreaker) && typeof currentBreaker[EXECUTOR_BREAK_NAME][0].then === 'function') {
        // 如果是有全局当前断点记录，中断执行，等resolve后继续执行
        return currentBreaker = breaker(currentBreaker[EXECUTOR_BREAK_NAME][0].then(breakerResolved).catch(breakerCatched), 1);
      }
      if (resumeExecutor) {
        // 如果目前命中了断点，暂停执行，并将恢复执行任务放入宏任务队列，等待断点恢复后再执行
        return breaker(new nativePromise((resolve) => {
          macroTaskList.push(() => {
            resolve(executor(generator, ret));
          });
        }));
      }
    }
    try {
      ret = generator.next(ret.value);
    } catch (err) {
      enableSandbox(false);
      if (err instanceof Error && !err.exceptionOriginMark) {
        const scopeChain = getScopeChain();
        if (Scope.lastPop) {
          // 因为此时错误所在作用域已经被pop了，所以取lastPop补充下信息
          scopeChain.push(Scope.lastPop);
        }
        const callStack = scopeChain.filter((scope) => !!scope.callFrame).reverse();
        if (err.name && err.message) {
          err.stack = [
            // 具体错误
            `${err.name}: ${err.message}`,
            // 调用栈信息
            ...callStack.map((scope) => {
              const callFrame = scope.callFrame;
              return `    at ${scope.name} (${callFrame.debuggerId}:${callFrame.lineNumber}:${callFrame.columnNumber})`;
            })
          ].join('\n');
        }
        emitEventListener('error', { error: err, scopeChain });
        err.exceptionOriginMark = true;
        // 如果设置了异常时暂停，中断执行，不抛出错误，等恢复时才抛出
        if (pause === 2) {
          const { debuggerId, lineNumber, columnNumber } = callStack[0].callFrame;
          emitEventListener('paused', pausedInfo = {
            reason: 'exception',
            data: err,
            debuggerId,
            lineNumber,
            columnNumber,
            scopeChain,
            scriptContent: getScriptContent(debuggerId)
          });
          // 记录全局当前断点
          return currentBreaker = breaker(new nativePromise((_, reject) => {
            resumeExecutor = () => reject(err);
          }), 1);
        }
      }
      throw err;
    }
    const pauseIfBreak = (breakRet) => {
      if (!skip && isBreaker(breakRet.value) && typeof breakRet.value[EXECUTOR_BREAK_NAME][0].then !== 'function') {
        const [
          debuggerId, // 调试id，通常为脚本的url
          breakpointId, // 断点id
          lineNumber, // 断点行号
          columnNumber, // 断点列号
        ] = breakRet.value[EXECUTOR_BREAK_NAME];
        // 否则，就是命中断点，中断执行
        enableSandbox(false);
        emitEventListener('paused', pausedInfo = {
          breakpointId,
          debuggerId,
          lineNumber,
          columnNumber,
          scopeChain: getScopeChain(),
          scriptContent: getScriptContent(debuggerId)
        });
        // 记录全局当前断点
        return currentBreaker = breaker(new nativePromise((resolve, reject) => {
          resumeExecutor = () => {
            try {
              resolve(executor(generator, breakRet));
            } catch (err) {
              reject(err);
            }
          };
        }), 1);
      }
    };
    if (typeof ret.then === 'function') {
      // 如果是async function，等resolve后再继续
      return ret.then((resolvedRet) => {
        const res = pauseIfBreak(resolvedRet);
        return res?.[EXECUTOR_BREAK_NAME][0] || executor(generator, resolvedRet);
      });
    }
    const res = pauseIfBreak(ret);
    if (res) {
      return res;
    }
  }
  return ret.value;
}

/**
 * 跟踪作用域链
 * @param {Boolean} push 是否入栈
 * @param {Function} scopeEval 当前作用域eval函数
 * @param {Number} scopeName 当前函数作用域名称
 */
function scope(push, scopeEval, scopeName) {
  if (push) {
    Scope.chain.push(new Scope(scopeEval, scopeName));
  } else {
    Scope.lastPop = Scope.chain.pop();
    if (Scope.lastPop === Scope.curNamedScope) {
      Scope.curNamedScope = null;
    }
    if (Scope.chain.length < 2) { // 只剩下全局作用域(length:1)或没有在执行(length:0)
      // 如果有定义断点恢复设置，callFrameId设为极大，当前过程跑完后，保证能在下个循环中断住
      resumeOptions && (resumeOptions.callFrameId = Number.MAX_SAFE_INTEGER);
      // 执行下一个宏任务
      executeNextMacroTask();
    }
  }
}

/**
 * 创建对象
 * @param {Function} constructor 构造函数
 * @param {Array} args 初始化参数
 */
function* newObject(constructor, args, target) {
  if (constructor === Proxy) {
    const [ctx, handlers] = args;
    return new Proxy(ctx, Object.assign(Object.create(handlers.__proto__), handlers, {
      get(...getArgs) {
        if (PROXY_MARK === getArgs[1]) {
          return true;
        }
        if (typeof handlers.get === 'function' && EXECUTOR_BREAK_NAME !== getArgs[1]) {
          return handlers.get.apply(this, getArgs);
        }
        return Reflect.get.apply(this, getArgs);
      }
    }));
  }
  const obj = Reflect.construct(constructor, args, arguments.length > 2 ? target : constructor);
  if (obj[CLASS_CONSTRUCTOR_NAME]) {
    try {
      const ret = yield* obj[CLASS_CONSTRUCTOR_NAME](...args);
      delete obj[CLASS_CONSTRUCTOR_NAME];
      if (ret && (typeof ret === 'object' || typeof ret === 'function')) {
        return ret;
      }
    } finally {
      scope(false);
    }
  }
  return obj;
}

/**
 * 赋值，如果有setter，获取到原set来调用，防止协程插队
 * @param {Object} obj 赋值对象
 * @param {String} key 赋值属性
 * @param {Any} value 值
 */
function setter(obj, key, value) {
  const dptor = getPropertyDescriptor(obj, key);
  if (!obj[PROXY_MARK] && dptor?.set) {
    try {
      dptor.set.call(obj, value);
      return value;
    } catch (err) { /* empty */ }
  }
  return obj[key] = value;
}

/**
 * 处理模块exports
 * @param {String} debuggerId 调试id，通常为脚本的url
 * @param {Object} exports 模块exports
 */
function resolveModuleExports(debuggerId, exports) {
  const importResolve = moduleMap.get(debuggerId);
  moduleMap.set(debuggerId, exports);
  if (typeof importResolve === 'function') {
    importResolve();
  }
}

/**
 * 请求模块
 * @param {Array} paths 需要请求的模块路径列表
 * @param {String} debuggerId 调试id，通常为脚本的url
 */
function requestModules(paths, debuggerId) {
  const resolveList = [];
  for (let i = 0; i < paths.length; i++) {
    const importUrl = getImportUrl(paths[i], debuggerId);
    const cacheScript = moduleMap.get(importUrl);
    if (!cacheScript) {
      resolveList.push(moduleRequest(importUrl).then((script) => moduleMap.set(importUrl, script)));
    }
  }
  if (resolveList.length) {
    enableSandbox(false);
    return breaker(nativePromise.all(resolveList));
  }
}

/**
 * 引入模块
 * @param {String} path 需要引入的模块路径
 * @param {String} debuggerId 调试id，通常为脚本的url
 * @param {Boolean} dynamic 是否为动态import
 */
function importModule(path, debuggerId, dynamic) {
  const importUrl = getImportUrl(path, debuggerId);
  const cacheModule = moduleMap.get(importUrl);
  if (typeof cacheModule === 'object') {
    return cacheModule;
  } else if (typeof cacheModule === 'string') {
    nativePromise.resolve()
      .then(() => debug(cacheModule, importUrl)());
  } else {
    requestModules([path], debuggerId)[EXECUTOR_BREAK_NAME][0]
      .then(() => debug(moduleMap.get(importUrl), importUrl)());
  }
  // TODO: 动态import
  return breaker(new nativePromise((resolve) => {
    moduleMap.set(importUrl, () => resolve(moduleMap.get(importUrl)));
  }));
}

/**
 * 获取调试脚本
 * @param {String} script 源码
 * @param {Transformer} transformer 转换器
 */
function getDebugProgram(script, transformer) {
  if (script.startsWith(TRANSFORMED_MARK)) {
    // 如果是预转换的脚本，则覆盖transformer设置并返回预转换结果
    const [
      debuggerId, debugProgram, lBpIdMInit, staticBpMInit,
    ] = JSON.parse(script.slice(TRANSFORMED_MARK.length));

    transformer.debuggerId = debuggerId || transformer.debuggerId;
    transformer.lineBreakpointIdsMap = new Map(lBpIdMInit);

    staticBpMInit.forEach(([key, value]) => {
      if (!Transformer.breakpointMap.has(key)) {
        Transformer.breakpointMap.set(key, value);
      }
    });

    return debugProgram;
  }

  // 否则，运行时转换代码
  return transformer.run(script);
}

/**
 * 调试代码
 * @param {String} script 源码
 * @param {String} debuggerId 调试id，通常为脚本的url
 */
export function debug(script, debuggerId) {
  if (!supported || typeof script !== 'string' || debuggerId && typeof debuggerId !== 'string') {
    if (!supported) {
      console.warn('[vDebugger] Current environment is unsupported.');
    }
    return false;
  }

  // 转换代码
  const transformer = new Transformer(debuggerId);
  const debugProgram = getDebugProgram(script, transformer);
  // console.warn(debugProgram);

  // 保存当前实例
  transformerMap.set(transformer.debuggerId, transformer);

  // 执行代码
  const complete = (exports) => {
    resolveModuleExports(transformer.debuggerId, exports);
    executeNextMacroTask();
  };
  const execute = () => {
    const fn = nativeEval(debugProgram)[0];
    const ret = executor(fn(
      checkIfBreak, executor, scope, setter,
      newObject, requestModules, importModule
    ));
    ret?.then && ret.then(complete) || complete(ret);
  };
  const run = () => {
    // 检查是否需要阻塞，如果需要阻塞，则暂停执行，并将恢复执行任务放入宏任务队列，等待断点恢复后再执行
    resumeExecutor ? macroTaskList.push(execute) : execute();
  };

  // 返回执行函数
  return run;
}

/**
 * 转换代码，用于编译时转换，优化运行时性能
 * @param {String} script 源码
 * @param {String} debuggerId 调试id，通常为脚本的url
 */
export function transform(script, debuggerId) {
  if (typeof script !== 'string' || debuggerId && typeof debuggerId !== 'string') {
    return false;
  }

  // 如果是已经转换过的代码，直接返回结果
  if (script.startsWith(TRANSFORMED_MARK)) {
    return script;
  }

  // 转换代码
  const transformer = new Transformer(debuggerId);
  const debugProgram = transformer.run(script);
  // console.warn(debugProgram);

  // 格式化数据结构
  const lBpIdMEntries = transformer.lineBreakpointIdsMap.entries();
  const staticBpMEntries = Transformer.breakpointMap.entries();
  const result = [transformer.debuggerId, debugProgram, [...lBpIdMEntries], [...staticBpMEntries]];

  return TRANSFORMED_MARK + JSON.stringify(result);
}

/**
 * 恢复执行
 * @param {String} type 恢复类型
 */
export function resume(type) {
  if (type && ['stepInto', 'stepOver', 'stepOut'].indexOf(type) === -1) {
    return false;
  }
  const currentExecutor = resumeExecutor;
  if (currentExecutor) {
    resumeOptions = { type, callFrameId: Scope.getCurrentCallFrameId() }; // 定义断点恢复设置
    resumeExecutor = null;
    currentBreaker = null;
    pausedInfo = null;
    emitEventListener('resumed');
    currentExecutor();
    return true;
  }
  return false;
}

/**
 * 在特定作用域下执行表达式
 * @param {String} expression 表达式
 * @param {Number} callFrameId 调用帧id
 */
export function evaluate(expression, callFrameId) {
  if (typeof expression !== 'string') {
    return false;
  }
  const scope = Scope.getScopeByCallFrameId(callFrameId);
  return scope ? scope.eval(expression) : nativeEval(expression);
}

/**
 * 获取脚本所有可能的断点
 * @param {String} debuggerId 调试id，通常为脚本的url
 */
export function getPossibleBreakpoints(debuggerId) {
  if (typeof debuggerId !== 'string') {
    return false;
  }
  const transformer = transformerMap.get(debuggerId);
  if (transformer) {
    let breakpoints = [];
    for (const [lineNumber, lineBreakpointIds] of transformer.lineBreakpointIdsMap.entries()) {
      breakpoints = breakpoints.concat(
        Object.keys(lineBreakpointIds)
          .map((c) => ({ id: lineBreakpointIds[c], lineNumber, columnNumber: c * 1 }))
      );
    }
    return breakpoints;
  }
  return false;
}

/**
 * 设置断点
 * @param {String} debuggerId 调试id，通常为脚本的url
 * @param {Number} lineNumber 尝试断点的行号
 * @param {Number} columnNumber 尝试断点的列号（或断点条件，重载）
 * @param {String} condition 断点条件
 */
export function setBreakpoint(debuggerId, lineNumber, columnNumber, condition) {
  if (typeof debuggerId !== 'string' || typeof lineNumber !== 'number') {
    return false;
  }
  if (typeof columnNumber === 'string') {
    condition = columnNumber;
    columnNumber = null;
  }
  const transformer = transformerMap.get(debuggerId);
  if (transformer) {
    for (let l = lineNumber; l < lineNumber + 50; l++) { // 向下找最多50行
      const lineBreakpointIds = transformer.lineBreakpointIdsMap.get(l);
      if (lineBreakpointIds) {
        let id, c;
        if (typeof columnNumber === 'number') {
          for (c = columnNumber; c < columnNumber + 200; c++) { // 向右找最多200列
            if (id = lineBreakpointIds[c]) break;
          }
        } else {
          c = Object.keys(lineBreakpointIds)[0];
          id = lineBreakpointIds[c];
        }
        if (id) {
          Transformer.breakpointMap.set(id, typeof condition === 'string' && condition || true);
          return { id, lineNumber: l, columnNumber: c };
        }
      }
    }
  }
  return false;
}

/**
 * 移除断点
 * @param {Number} id 断点id
 */
export function removeBreakpoint(id) {
  if (typeof id !== 'number') {
    return false;
  }
  return Transformer.breakpointMap.delete(id);
}

/**
 * 断点启用设置
 * @param {Boolean} value 是否启用断点
 */
export function setBreakpointsActive(value) {
  return active = !!value;
}

/**
 * 执行暂停配置
 * @param {Boolean} value 是否暂停执行
 */
export function setExecutionPause(value) {
  return !!(pause = value ? 1 : 0);
}

/**
 * 执行异常暂停配置
 * @param {Boolean} value 是否异常时暂停执行
 */
export function setExceptionPause(value) {
  return !!(pause = value ? 2 : 0);
}

/**
 * 获取当前暂停信息
 */
export function getPausedInfo() {
  return pausedInfo || false;
}

/**
 * 获取当前作用域链
 */
export function getScopeChain() {
  return [].concat(Scope.chain);
}

/**
 * 获取调试源码
 */
export function getScriptContent(debuggerId) {
  const transformer = transformerMap.get(debuggerId);
  return transformer?.scriptContent || '';
}

/**
 * 在原生环境下执行代码
 * @param {Function} callback 执行回调
 */
export function runInNativeEnv(callback) {
  if (typeof callback !== 'function') {
    return false;
  }
  const oriSandbox = sandbox;
  enableSandbox(false);
  try {
    return callback();
  } catch (err) {
    return false;
  } finally {
    enableSandbox(oriSandbox);
  }
}

/**
 * 跳过调试执行代码
 * @param {Function} callback 执行回调
 */
export function runInSkipOver(callback) {
  if (typeof callback !== 'function') {
    return false;
  }
  const oriSkip = skip;
  skip = true;
  try {
    return callback();
  } catch (err) {
    return false;
  } finally {
    skip = oriSkip;
  }
}

/**
 * 设置模块请求函数
 * @param {Function} request 请求函数
 */
export function setModuleRequest(request) {
  if (typeof request === 'function') {
    return !!(moduleRequest = request);
  }
  return false;
}

export { version, addEventListener, removeEventListener }
export default {
  version, debug, transform, resume, evaluate, getPossibleBreakpoints, setBreakpoint, removeBreakpoint,
  setBreakpointsActive, setExecutionPause, setExceptionPause, getPausedInfo, getScopeChain, getScriptContent,
  runInNativeEnv, runInSkipOver, setModuleRequest, addEventListener, removeEventListener,
}
