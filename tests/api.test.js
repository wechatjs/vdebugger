/**
 * @jest-environment jsdom
 */

import vDebugger from '../src';

describe('api tests', () => {
  it('debug params check normally', () => {
    expect(vDebugger.debug(1)).toBeFalsy(); // 脚本非字符串
    expect(vDebugger.debug('1', 1)).toBeFalsy(); // debuggerId非字符串
  });

  it('transform params check normally', () => {
    expect(vDebugger.transform(1)).toBeFalsy(); // 脚本非字符串
    expect(vDebugger.transform('1', 1)).toBeFalsy(); // debuggerId非字符串

    const transformed = vDebugger.transform('1', '1');
    expect(vDebugger.transform(transformed)).toBe(transformed); // 如果传入转换后的代码，则直接返回相同的
  });

  it('resume params check normally', () => {
    expect(vDebugger.resume(1)).toBeFalsy(); // type非字符串
    expect(vDebugger.resume('error')).toBeFalsy(); // type非指定值
  });

  it('evaluate params check normally', () => {
    expect(vDebugger.evaluate(1)).toBeFalsy(); // expression非字符串
  });

  it('set breakpoints params check normally', () => {
    expect(vDebugger.setBreakpoint(1)).toBeFalsy(); // debuggerId非字符串
    expect(vDebugger.setBreakpoint('1', '1')).toBeFalsy(); // lineNumber非数字
    expect(vDebugger.setBreakpoint('1', 1)).toBeFalsy(); // 未能根据debuggerId找到脚本
  });

  it('remove breakpoint params check normally', () => {
    expect(vDebugger.removeBreakpoint('1')).toBeFalsy(); // breakpointId非数字
  });

  it('run in native env params check normally', () => {
    expect(vDebugger.runInNativeEnv(1)).toBeFalsy(); // callback非函数
  });

  it('run in skip over params check normally', () => {
    expect(vDebugger.runInSkipOver(1)).toBeFalsy(); // callback非函数
  });

  it('set module request params check normally', () => {
    expect(vDebugger.setModuleRequest(1)).toBeFalsy(); // request非函数
  });
});
 