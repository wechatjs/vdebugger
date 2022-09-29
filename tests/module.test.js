/**
 * @jest-environment jsdom
 */

import vDebugger from '../src';
import axios from 'axios';

describe('module tests', () => {
  beforeAll(() => {
    vDebugger.setModuleRequest((url) => axios(url).then((res) => res.data));
  });

  it('import normally', (done) => {
    window.importTestExpect = expect;
    window.importTestDone = done;
    const run = vDebugger.debug(
      'import { nextTick } from "./npm/vue@2.7.8/dist/vue.esm.browser.min.js";\n' +
      'window.importTestExpect(nextTick).toBeTruthy();\n' +
      'window.importTestDone();'
    , 'https://cdn.jsdelivr.net/index.js');
    expect(run).toBeTruthy();
    run();
  });

  it('export normally', () => {
    const run = vDebugger.debug(
      'const a = 1;\n' +
      'const d = 3;\n' +
      'export const b = 2;\n' +
      'export { a, d as c }\n' +
      'export function e(f) { return f };\n' +
      'export class g { constructor(h) { this.h = h } };\n' +
      'export const { i } = { i: 6 };\n' +
      'export default function j(k) { return k };'
    , 'https://export.test/export.js');
    expect(run).toBeTruthy();
    run();

    const run2 = vDebugger.debug('export { i } from "./export.js"', 'https://export.test/export2.js');
    expect(run2).toBeTruthy();
    run2();

    const run3 = vDebugger.debug('window.l = 8', 'https://export.test/export3.js');
    expect(run3).toBeTruthy();
    run3();

    const entry = 'https://export.test/index.js';
    const run4 = vDebugger.debug(
      'import j, { a, b, c, e, g } from "./export.js";\n' +
      'import { i } from "./export2.js";\n' +
      'import "./export3.js";\n' +
      'window.a = a;\n' +
      'window.b = b;\n' +
      'window.c = c;\n' +
      'window.e = e(4);\n' +
      'window.g = new g(5).h;\n' +
      'window.i = i;\n' +
      'window.j = j(7);\n' +
      'window.meta = import.meta;'
    , entry);
    expect(run4).toBeTruthy();
    run4();

    expect(window.a).toBe(1);
    expect(window.b).toBe(2);
    expect(window.c).toBe(3);
    expect(window.e).toBe(4);
    expect(window.g).toBe(5);
    expect(window.i).toBe(6);
    expect(window.j).toBe(7);
    expect(window.l).toBe(8);
    expect(window.meta.url).toBe(entry);
  });
});
