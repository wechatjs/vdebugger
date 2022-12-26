/**
 * @jest-environment jsdom
 */

import vDebugger from '../src';

describe('compiler tests', () => {
  it('compile normally', () => {
    const res = vDebugger.transform(
      'window.__trans_res__ = 2;\n' +
      'debugger;\n' + // 第2行
      'window.__trans_res__ = 3;\n' +
      'window.__trans_res__ = 4;\n' +
      'window.__trans_res__ = 5;'
    , 'transform.js');
    expect(res).toBeTruthy();

    const run = vDebugger.debug(res);
    expect(run).toBeTruthy();

    const breakLine = 2; // 对应第2行的debugger断点

    run();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(breakLine);
    expect(window.__trans_res__).toEqual(2);

    const resumeRes = vDebugger.resume('stepOver');
    expect(resumeRes).toBeTruthy();
    const resumeRes2 = vDebugger.resume('stepOver');
    expect(resumeRes2).toBeTruthy();
    const pausedInfo2 = vDebugger.getPausedInfo();
    expect(pausedInfo2).toBeTruthy();
    expect(pausedInfo2.lineNumber).toEqual(breakLine + 2);
    expect(window.__trans_res__).toEqual(3);

    const resumeRes3 = vDebugger.resume();
    expect(resumeRes3).toBeTruthy();
    const pausedInfo3 = vDebugger.getPausedInfo();
    expect(pausedInfo3).toBeFalsy();
    expect(window.__trans_res__).toEqual(5);
  });

  it('compile chain expression normally', () => {
    const res = vDebugger.transform(
      'const a = { b: () => 7 }\n' +
      'window.__trans_res__ = 6 && a?.b();\n'
    , 'chain-expr-transform.js');
    expect(res).toBeTruthy();

    const run = vDebugger.debug(res);
    expect(run).toBeTruthy();

    run();

    expect(window.__trans_res__).toEqual(7);
  });
});
 