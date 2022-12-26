/**
 * @jest-environment jsdom
 */

import vDebugger from '../src';
import { nextTick } from './utils';

describe('async function tests', () => {
  it('run async function normally', async () => {
    const run = vDebugger.debug(
      'async function a() { return 1; }\n' +
      'async function b() { return (await a()) + 1; }\n' +
      'b().then((r) => window.__trans_res__ = r);'
    , 'async.js');
    expect(run).toBeTruthy();

    run();

    await nextTick();
    expect(window.__trans_res__).toEqual(2);
  });

  it('break async function normally', async () => {
    const run = vDebugger.debug(
      'async function c() {\n' +
      '  window.__trans_res__ = await 3;\n' +
      '  window.__trans_res__ = await 4;\n' +
      '  window.__trans_res__ = await 5;\n' +
      '}\n' +
      'c();'
    , 'async-break.js');
    expect(run).toBeTruthy();

    const breakLine = 3;
    vDebugger.setBreakpoint('async-break.js', breakLine);
    const breakLine2 = 4;
    vDebugger.setBreakpoint('async-break.js', breakLine2);

    run();

    await nextTick();
    expect(window.__trans_res__).toEqual(3);

    vDebugger.resume();
    await nextTick();
    expect(window.__trans_res__).toEqual(4);

    vDebugger.resume();
    await nextTick();
    expect(window.__trans_res__).toEqual(5);
  });
});
