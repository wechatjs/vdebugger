/**
 * @jest-environment jsdom
 */

import vDebugger from '../src';

describe('breakpoint tests', () => {
  it('transform normally', () => {
    const run = vDebugger.debug(
      'Object.defineProperty(window, "__setter__", { set() { window.__trans_res__ = 1 } });\n' +
      'window.__trans_res__ = window.__setter__ = 2;'
    );
    expect(run).toBeTruthy();

    run();
    expect(window.__trans_res__).toEqual(2);
  });
});
