/**
 * @jest-environment jsdom
 */

import { nextTick } from './utils';
import vDebugger from '../src';

describe('breakpoint tests', () => {
  let errorEventRes = null;
  let pausedEventRes = null;
  let resumedEventRes = true;
  const errorListener = (error) => errorEventRes = error;
  const resumedListener = () => resumedEventRes = true;
  const pausedListener = (pausedInfo) => {
    pausedEventRes = pausedInfo;
    resumedEventRes = false;
  };

  beforeAll(() => {
    expect(vDebugger.addEventListener('error', errorListener)).toBeTruthy();
    expect(vDebugger.addEventListener('resumed', resumedListener)).toBeTruthy();
    expect(vDebugger.addEventListener('paused', pausedListener)).toBeTruthy();
    expect(vDebugger.addEventListener()).toBeFalsy(); // 试一下传参不合法时是否有进行保护
  });

  afterAll(() => {
    expect(vDebugger.removeEventListener('error', errorListener)).toBeTruthy();
    expect(vDebugger.removeEventListener('resumed', resumedListener)).toBeTruthy();
    expect(vDebugger.removeEventListener('paused', pausedListener)).toBeTruthy();
    expect(vDebugger.removeEventListener('paused', pausedListener)).toBeFalsy(); // 试一下重复移除是否有进行保护
    expect(vDebugger.removeEventListener()).toBeFalsy(); // 试一下传参不合法时是否有进行保护
  });

  it('transform normally', () => {
    const run = vDebugger.debug('window.__trans_res__ = 1;');
    expect(run).toBeTruthy();

    run();
    expect(window.__trans_res__).toEqual(1);
  });

  it('break normally', () => {
    const run = vDebugger.debug(
      'window.__trans_res__ = 2;\n' +
      'window.__trans_res__ = 3;\n' +
      'window.__trans_res__ = 4;\n' +
      'window.__trans_res__ = 5;'
    , 'breakpoint.js');
    expect(run).toBeTruthy();
    expect(resumedEventRes).toBeTruthy();

    const breakLine = 2;
    vDebugger.setBreakpoint('breakpoint.js', breakLine);

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo).toBe(pausedEventRes);
    expect(pausedInfo.lineNumber).toEqual(breakLine);
    expect(resumedEventRes).toBeFalsy();
    expect(window.__trans_res__).toEqual(2);

    const resumeRes = vDebugger.resume('stepOver');
    expect(resumeRes).toBeTruthy();
    const pausedInfo2 = vDebugger.getPausedInfo();
    expect(pausedInfo2).toBeTruthy();
    expect(pausedInfo2.lineNumber).toEqual(breakLine + 1);
    expect(window.__trans_res__).toEqual(3);

    const resumeRes2 = vDebugger.resume();
    expect(resumeRes2).toBeTruthy();
    expect(resumedEventRes).toBeTruthy();
    const pausedInfo3 = vDebugger.getPausedInfo();
    expect(pausedInfo3).toBeFalsy();
    expect(window.__trans_res__).toEqual(5);
  });

  it('break normally if non-sandbox calls', async () => {
    window.call = function (c) { c() };
    const run = vDebugger.debug(
      'window.__trans_res__ = 6;\n' +
      'window.call(() => {\n' +
      '  window.__trans_res__ = 7;\n' +
      '});\n' +
      'window.__trans_res__ = 8;'
    , 'non-sandbox.js');
    expect(run).toBeTruthy();
    
    const breakLine = 3;
    vDebugger.setBreakpoint('non-sandbox.js', breakLine);

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(breakLine);
    expect(window.__trans_res__).toEqual(6);

    const resumeRes = vDebugger.resume();
    expect(resumeRes).toBeTruthy();
    await nextTick();
    expect(window.__trans_res__).toEqual(8);
  });

  it('remove breakpoint normally', () => {
    const run = vDebugger.debug(
      'window.__trans_res__ = 9;\n' +
      'window.__trans_res__ = 10;\n' +
      'window.__trans_res__ = 11;'
    , 'remove.js');
    expect(run).toBeTruthy();

    const breakLine = 2;
    vDebugger.setBreakpoint('remove.js', breakLine);
    const removeBreakpoint = vDebugger.setBreakpoint('remove.js', 3);

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(breakLine);
    expect(window.__trans_res__).toEqual(9);

    vDebugger.removeBreakpoint(removeBreakpoint.id);

    const resumeRes = vDebugger.resume();
    expect(resumeRes).toBeTruthy();
    expect(window.__trans_res__).toEqual(11);
  });

  it('evaluate normally', () => {
    const run = vDebugger.debug(
      'const a = 999;\n' +
      'window.__trans_res__ = 12;'
    , 'evaluate.js');
    expect(run).toBeTruthy();

    const breakLine = 2;
    vDebugger.setBreakpoint('evaluate.js', breakLine);

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(breakLine);

    const scopeChain = vDebugger.getScopeChain();
    const curScope = scopeChain.pop();
    const value = vDebugger.evaluate('a', curScope.callFrameId);
    expect(value).toEqual(999);

    const resumeRes = vDebugger.resume();
    expect(resumeRes).toBeTruthy();
    expect(window.__trans_res__).toEqual(12);
  });

  it('pause execution normally', () => {
    const run = vDebugger.debug('window.__trans_res__ = 13;', 'pause.js');
    expect(run).toBeTruthy();

    vDebugger.setExecutionPause(true);

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(1);
    expect(window.__trans_res__).toEqual(12);

    const resumeRes = vDebugger.resume();
    expect(resumeRes).toBeTruthy();
    expect(window.__trans_res__).toEqual(13);
  });

  it('inactive breakpoint normally', () => {
    const run = vDebugger.debug('window.__trans_res__ = 14;', 'inactive.js');
    expect(run).toBeTruthy();

    const breakLine = 1;
    vDebugger.setBreakpoint('inactive.js', breakLine);
    vDebugger.setBreakpointsActive(false);

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeFalsy();
    expect(window.__trans_res__).toEqual(14);
    vDebugger.setBreakpointsActive(true);
  });

  it('run in native env normally', () => {
    window.native = () => {
      vDebugger.runInNativeEnv(() => {
        window.__trans_res__ = Array.from([15])[0];
      });
    };
    const run = vDebugger.debug(
      'const ori = Array.from;\n' +
      'Array.from = () => [5];\n' +
      'window.native();\n' +
      'Array.from = ori;\n'
    , 'run-native.js');
    expect(run).toBeTruthy();

    run();
    expect(window.__trans_res__).toEqual(15);
  });

  it('run in skip over normally', async () => {
    const run = vDebugger.debug(
      'function a() {\n' +
        'return 16;\n' +
      '}\n' +
      'window.__trans_res__ = a();'
    , 'run-skip.js');
    expect(run).toBeTruthy();

    const breakLine = 4;
    const fnBreakLine = 2;
    vDebugger.setBreakpoint('run-skip.js', breakLine);
    vDebugger.setBreakpoint('run-skip.js', fnBreakLine);

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(breakLine);

    const scopeChain = vDebugger.getScopeChain();
    const curScope = scopeChain.pop();
    
    const value = vDebugger.runInSkipOver(() => {
      return vDebugger.evaluate('a()', curScope.callFrameId);
    });
    expect(value).toEqual(16);

    const resumeRes = vDebugger.resume();
    expect(resumeRes).toBeTruthy();
    expect(window.__trans_res__).toEqual(15);

    const resumeRes2 = vDebugger.resume();
    expect(resumeRes2).toBeTruthy();
    await nextTick();
    expect(window.__trans_res__).toEqual(16);
  });

  it('emit error normally', () => {
    const run = vDebugger.debug(
      'window.__trans_res__ = 17;\n' +
      '  windows.__trans_res__ = -1;\n' + // 前面故意空两格，看能不能正确定位到列
      'window.__trans_res__ = 18;'
    , 'error.js');
    expect(run).toBeTruthy();

    let tryCatchErr = null;
    try {
      run();
    } catch (err) {
      tryCatchErr = err;
    }

    expect(tryCatchErr).toBeTruthy();
    expect(errorEventRes.error).toBeTruthy();
    expect(tryCatchErr.stack).toEqual(errorEventRes.error.stack);
    expect(tryCatchErr.stack.indexOf('error.js:2:2')).not.toEqual(-1); // 看看定位到的位置对不对
  });

  it('condition break normally', () => {
    const run = vDebugger.debug(
      'window.__trans_res__ = 19;\n' +
      'window.__trans_res__ = 20;\n' +
      'window.__trans_res__ = 21;'
    , 'condition.js');
    expect(run).toBeTruthy();

    const condBreakLine = 2;
    const skipBreakLine = 3;
    vDebugger.setBreakpoint('condition.js', condBreakLine, 'window.__trans_res__ === 19');
    vDebugger.setBreakpoint('condition.js', skipBreakLine, 'window.__trans_res__ === 19');

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(condBreakLine);
    expect(window.__trans_res__).toEqual(19);

    const resumeRes = vDebugger.resume();
    expect(resumeRes).toBeTruthy();
    const pausedInfo2 = vDebugger.getPausedInfo();
    expect(pausedInfo2).toBeFalsy();
    expect(window.__trans_res__).toEqual(21);
  });

  it('step resume normally', async () => {
    const run = vDebugger.debug(
      'window.__trans_res__ = 22;\n' +
      'function p() {\n' +
      '  window.__trans_res__ += 2;\n' +
      '  window.__trans_res__--;\n' +
      '}\n' +
      'p();\n' + // 第6行，直接断在这里，再逐步调试
      'p();\n' +
      'p();'
    , 'step.js');
    expect(run).toBeTruthy();

    const breakLine = 6;
    vDebugger.setBreakpoint('step.js', breakLine);

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(breakLine);
    expect(window.__trans_res__).toEqual(22);

    const resumeRes = vDebugger.resume('stepInto');
    expect(resumeRes).toBeTruthy();
    const pausedInfo2 = vDebugger.getPausedInfo();
    expect(pausedInfo2).toBeTruthy();
    expect(pausedInfo2.lineNumber).toEqual(3);

    const resumeRes2 = vDebugger.resume('stepOut');
    expect(resumeRes2).toBeTruthy();
    await nextTick();
    const pausedInfo3 = vDebugger.getPausedInfo();
    expect(pausedInfo3).toBeTruthy();
    expect(pausedInfo3.lineNumber).toEqual(7);
    expect(window.__trans_res__).toEqual(23);

    const resumeRes3 = vDebugger.resume('stepOver');
    expect(resumeRes3).toBeTruthy();
    const pausedInfo4 = vDebugger.getPausedInfo();
    expect(pausedInfo4).toBeTruthy();
    expect(pausedInfo4.lineNumber).toEqual(8);
    expect(window.__trans_res__).toEqual(24);

    const resumeRes4 = vDebugger.resume();
    expect(resumeRes4).toBeTruthy();
    const pausedInfo5 = vDebugger.getPausedInfo();
    expect(pausedInfo5).toBeFalsy();
    expect(window.__trans_res__).toEqual(25);
  });

  it('block execution if paused normally', async () => {
    const run = vDebugger.debug(
      'window.__trans_res__ = 26;\n' +
      'window.__trans_res__ = 27;\n' +
      'setTimeout(() => window.__trans_res__ = 29);\n'
    , 'block.js');
    expect(run).toBeTruthy();

    vDebugger.setBreakpoint('block.js', 2);

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(2);
    expect(window.__trans_res__).toEqual(26);

    const run2 = vDebugger.debug('window.__trans_res__ = 28;', 'other.js');
    expect(run2).toBeTruthy();

    run2();
    const pausedInfo2 = vDebugger.getPausedInfo();
    expect(pausedInfo2).toBeTruthy();
    expect(pausedInfo2.lineNumber).toEqual(2);
    expect(window.__trans_res__).toEqual(26);

    vDebugger.resume();
    await nextTick();

    expect(window.__trans_res__).toEqual(29); // 会先赋值28，因为是同步的，再回去setTimeout赋值29，因为是异步的
  });

  it('pause exception normally', async () => {
    const run = vDebugger.debug(
      'window.__trans_res__ = 99999;\n' +
      'window.__trans_res__ = exception;\n' +
      'window.__trans_res__ = 100000;\n'
    , 'exception.js');
    expect(run).toBeTruthy();

    vDebugger.setExceptionPause(true);

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(2);
    expect(pausedInfo.reason).toEqual('exception');
    expect(pausedInfo.data).toBeInstanceOf(ReferenceError);
    expect(window.__trans_res__).toEqual(99999);
  });

  // 当前测试到此为止，因为最后一个测试用例是用于测试异常中断的，不会再恢复了
});
