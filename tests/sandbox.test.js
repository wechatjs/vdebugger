/**
 * @jest-environment jsdom
 */

import vDebugger from '../src';
import { nextTick } from './utils';

describe('class tests', () => {
  it('array foreach normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.arr = [1, 2, 3, 4];\n' +
      'window.ret = window.arr.forEach((e, i, a) => {\n' +
      '  window.res.push([e, i, a]);\n' +
      '});'
    , 'https://sandbox.test/array-foreach.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/array-foreach.js', 4);
    run();
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(window.arr.length);
    expect(window.ret).toBeUndefined();
    for (let i = 0; i < window.arr; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toBe(window.arr);
    }
  });

  it('array map normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.arr = [1, 2, 3, 4];\n' +
      'window.ret = window.arr.map((e, i, a) => {\n' +
      '  window.res.push([e, i, a]);\n' +
      '  return e + 1;\n' +
      '});'
    , 'https://sandbox.test/array-map.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/array-map.js', 4);
    run();
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(window.arr.length);
    expect(window.ret).toEqual(window.arr.map((e) => e + 1));
    for (let i = 0; i < window.arr; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toBe(window.arr);
    }
  });

  it('array filter normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.arr = [1, 2, 3, 4];\n' +
      'window.ret = window.arr.filter((e, i, a) => {\n' +
      '  window.res.push([e, i, a]);\n' +
      '  return e < 3;\n' +
      '});'
    , 'https://sandbox.test/array-filter.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/array-filter.js', 4);
    run();
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(window.arr.length);
    expect(window.ret).toEqual(window.arr.filter((e) => e < 3));
    for (let i = 0; i < window.arr; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toBe(window.arr);
    }
  });

  it('array reduce normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.arr = [1, 2, 3, 4];\n' +
      'window.ret = window.arr.reduce((p, e, i, a) => {\n' +
      '  window.res.push([e, i, a]);\n' +
      '  return p + e;\n' +
      '}, 0);'
    , 'https://sandbox.test/array-reduce.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/array-reduce.js', 4);
    run();
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(window.arr.length);
    expect(window.ret).toEqual(window.arr.reduce((p, e) => p + e, 0));
    for (let i = 0; i < window.arr; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toBe(window.arr);
    }
  });

  it('array every normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.arr = [1, 2, 3, 4];\n' +
      'window.ret = window.arr.every((e, i, a) => {\n' +
      '  window.res.push([e, i, a]);\n' +
      '  return e < 3;\n' +
      '}, 0);'
    , 'https://sandbox.test/array-every.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/array-every.js', 4);
    run();
    for (let i = 0; i < 3; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(3);
    expect(window.ret).toEqual(window.arr.every((e) => e < 3));
    for (let i = 0; i < 3; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toBe(window.arr);
    }
  });

  it('array some normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.arr = [1, 2, 3, 4];\n' +
      'window.ret = window.arr.some((e, i, a) => {\n' +
      '  window.res.push([e, i, a]);\n' +
      '  return e > 2;\n' +
      '}, 0);'
    , 'https://sandbox.test/array-some.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/array-some.js', 4);
    run();
    for (let i = 0; i < 3; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(3);
    expect(window.ret).toEqual(window.arr.some((e) => e > 2));
    for (let i = 0; i < 3; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toBe(window.arr);
    }
  });

  it('array find normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.arr = [1, 2, 3, 4];\n' +
      'window.ret = window.arr.find((e, i, a) => {\n' +
      '  window.res.push([e, i, a]);\n' +
      '  return e === 3;\n' +
      '}, 0);'
    , 'https://sandbox.test/array-find.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/array-find.js', 4);
    run();
    for (let i = 0; i < 3; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(3);
    expect(window.ret).toEqual(window.arr.find((e) => e === 3));
    for (let i = 0; i < 3; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toBe(window.arr);
    }
  });

  it('array findindex normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.arr = [1, 2, 3, 4];\n' +
      'window.ret = window.arr.findIndex((e, i, a) => {\n' +
      '  window.res.push([e, i, a]);\n' +
      '  return e === 3;\n' +
      '}, 0);'
    , 'https://sandbox.test/array-findindex.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/array-findindex.js', 4);
    run();
    for (let i = 0; i < 3; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(3);
    expect(window.ret).toBe(2);
    for (let i = 0; i < 3; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toBe(window.arr);
    }
  });

  it('array sort normally', async () => {
    const run = vDebugger.debug(
      'window.arr = [2, 1, 4, 3];\n' +
      'window.ret = window.arr.sort((a, b) => {\n' +
      '  return a - b;\n' +
      '});'
    , 'https://sandbox.test/array-sort.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/array-sort.js', 3);
    run();
    let r = true;
    while (r) {
      r = vDebugger.resume();
      await nextTick();
    }
    expect(window.ret).toEqual([1, 2, 3, 4]);
  });

  it('string replace normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.ret = "abcbd".replace(/(b)/g, (m0, m1, i, s) => {\n' +
      '  window.res.push([m0, m1, i, s]);\n' +
      '  return "o";\n' +
      '});'
    , 'https://sandbox.test/string-replace.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/string-replace.js', 3);
    run();
    for (let i = 0; i < 2; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(2);
    expect(window.ret).toBe('aocod');
    for (let i = 0; i < 2; i++) {
      expect(window.res[i][0]).toBe('b');
      expect(window.res[i][1]).toBe('b');
      expect(window.res[i][2]).toBe(i * 2 + 1);
      expect(window.res[i][3]).toBe('abcbd');
    }
  });
});
 