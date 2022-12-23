/**
 * @jest-environment jsdom
 */

import vDebugger from '../src';

describe('trick tests', () => {
  it('redeclare in global scope normally', () => {
    const run = vDebugger.debug(
      'function a() {}\n' +
      'var a;'
    );
    expect(run).toBeTruthy();

    run();
  });

  it('redeclare in function scope normally', () => {
    const run = vDebugger.debug(
      'function b() {\n' +
      '  function a() {}\n' +
      '  var a;\n' +
      '}'
    );
    expect(run).toBeTruthy();

    run();
  });
});
