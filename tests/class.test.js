/**
 * @jest-environment jsdom
 */

import vDebugger from '../src';

describe('class tests', () => {
  beforeAll(() => {
    const run = vDebugger.debug(
      'export function A() { this.v = 1 }\n' +
      'export class B { constructor() { this.v = 1 } }\n' +
      'export function C() { window.t = new.target; this.v = 2; return { v: 3 } }\n' +
      'export function D() { this.v = 2; return 3 }'
    , 'https://class.test/class.js');
    run();
  });

  it('new function normally', () => {
    const run = vDebugger.debug(
      'import { A } from "class.js";\n' +
      'const a = new A();\n' +
      'window.a = a.v;'
    , 'https://class.test/new-function.js');
    expect(run).toBeTruthy();
    run();
    expect(window.a).toBe(1);
  });

  it('new class normally', () => {
    const run = vDebugger.debug(
      'import { B } from "class.js";\n' +
      'const b = new B();\n' +
      'window.b = b.v;'
    , 'https://class.test/new-class.js');
    expect(run).toBeTruthy();
    run();
    expect(window.b).toBe(1);
  });

  it('reflect construct function normally', () => {
    const run = vDebugger.debug(
      'import { A } from "class.js";\n' +
      'const fa = Reflect.construct(A, []);\n' +
      'window.fa = fa.v;'
    , 'https://class.test/reflect-function.js');
    expect(run).toBeTruthy();
    run();
    expect(window.fa).toBe(1);
  });

  it('reflect construct class normally', () => {
    const run = vDebugger.debug(
      'import { B } from "class.js";\n' +
      'const fb = Reflect.construct(B, []);\n' +
      'window.fb = fb.v;'
    , 'https://class.test/reflect-class.js');
    expect(run).toBeTruthy();
    run();
    expect(window.fb).toBe(1);
  });

  it('get target from new normally', () => {
    const run = vDebugger.debug(
      'import { C } from "class.js";\n' +
      'window.C = C;\n' +
      'new C();'
    , 'https://class.test/get-new-ori-target.js');
    expect(run).toBeTruthy();
    run();
    expect(window.t).toBe(window.C);
  });

  it('get target from reflect construct normally', () => {
    const run = vDebugger.debug(
      'import { C } from "class.js";\n' +
      'window.C = C;\n' +
      'Reflect.construct(C, []);'
    , 'https://class.test/get-reflect-ori-target.js');
    expect(run).toBeTruthy();
    run();
    expect(window.t).toBe(window.C);

    const run2 = vDebugger.debug(
      'import { B, C } from "class.js";\n' +
      'window.B = B;\n' +
      'Reflect.construct(C, [], B);'
    , 'https://class.test/get-reflect-new-target.js');
    expect(run2).toBeTruthy();
    run2();
    expect(window.t).toBe(window.B);
  });

  it('get return normally', () => {
    const run = vDebugger.debug(
      'import { C } from "class.js";\n' +
      'const rc = new C();\n' +
      'window.rc = rc.v;'
    , 'https://class.test/get-return.js');
    expect(run).toBeTruthy();
    run();
    expect(window.rc).toBe(3);

    const run2 = vDebugger.debug(
      'import { D } from "class.js";\n' +
      'const rd = new D();\n' +
      'window.rd = rd.v;'
    , 'https://class.test/get-return.js');
    expect(run2).toBeTruthy();
    run2();
    expect(window.rd).toBe(2);
  });
});
