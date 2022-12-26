/**
 * @jest-environment jsdom
 */

import vDebugger from '../src';
import { nextTick } from './utils';

describe('function tests', () => {
  it('run async function normally', async () => {
    const run = vDebugger.debug(
      'async function a() { return 1; }\n' +
      'async function b() { return (await a()) + 1; }\n' +
      'b().then((r) => window.__trans_res__ = r);'
    );
    expect(run).toBeTruthy();

    run();

    await nextTick();
    expect(window.__trans_res__).toEqual(2);
  });
});
