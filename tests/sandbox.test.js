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
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toEqual(window.arr);
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
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toEqual(window.arr);
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
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toEqual(window.arr);
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
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toEqual(window.arr);
    }
  });

  it('array reduceright normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.arr = [1, 2, 3, 4];\n' +
      'window.ret = window.arr.reduceRight((p, e, i, a) => {\n' +
      '  window.res.push([e, i, a]);\n' +
      '  return p + e;\n' +
      '}, 0);'
    , 'https://sandbox.test/array-reduceright.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/array-reduceright.js', 4);
    run();
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(window.arr.length);
    expect(window.ret).toEqual(window.arr.reduceRight((p, e) => p + e, 0));
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res[i][0]).toBe(window.arr[window.arr.length - i - 1]);
      expect(window.res[i][1]).toBe(window.arr.length - i - 1);
      expect(window.res[i][2]).toEqual(window.arr);
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
      expect(window.res[i][2]).toEqual(window.arr);
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
      expect(window.res[i][2]).toEqual(window.arr);
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
    expect(window.ret).toEqual(window.arr);
    expect(window.ret).toEqual([2, 1, 4, 3].sort((a, b) => a - b));
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
      expect(window.res[i][2]).toEqual(window.arr);
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
      expect(window.res[i][2]).toEqual(window.arr);
    }
  });

  it('array from normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.arr = [1, 2, 3, 4];\n' +
      'window.ret = Array.from(window.arr, (e, i, a) => {\n' +
      '  window.res.push([e, i, a]);\n' +
      '  return e + 1;\n' +
      '});'
    , 'https://sandbox.test/array-from.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/array-from.js', 4);
    run();
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(window.arr.length);
    expect(window.ret).toEqual(Array.from(window.arr, (e) => e + 1));
    for (let i = 0; i < window.arr.length; i++) {
      expect(window.res[i][0]).toBe(window.arr[i]);
      expect(window.res[i][1]).toBe(i);
      expect(window.res[i][2]).toEqual(window.arr);
    }
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

  it('map foreach normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.map = new Map([[1, 2], [3, 4]]);\n' +
      'window.ret = window.map.forEach((v, i, m) => {\n' +
      '  window.res.push([v, i, m]);\n' +
      '});'
    , 'https://sandbox.test/map-foreach.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/map-foreach.js', 4);
    run();
    for (let i = 0; i < window.map.size; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(window.map.size);
    expect(window.ret).toBeUndefined();
    for (let i = 0; i < window.map.size; i++) {
      expect(window.map.get(window.res[i][1])).toBe(window.res[i][0]);
      expect(window.res[i][2]).toBe(window.map);
    }
    const res = [];
    window.map.forEach((v, i, m) => res.push([v, i, m]));
    expect(window.res).toEqual(res);
  });

  it('set foreach normally', async () => {
    const run = vDebugger.debug(
      'window.res = [];\n' +
      'window.set = new Set([1, 2, 3, 4]);\n' +
      'window.ret = window.set.forEach((v, i, s) => {\n' +
      '  window.res.push([v, i, s]);\n' +
      '});'
    , 'https://sandbox.test/set-foreach.js');
    expect(run).toBeTruthy();
    vDebugger.setBreakpoint('https://sandbox.test/set-foreach.js', 4);
    run();
    for (let i = 0; i < window.set.size; i++) {
      expect(window.res.length).toBe(i);
      vDebugger.resume();
      await nextTick();
    }
    expect(window.res.length).toBe(window.set.size);
    expect(window.ret).toBeUndefined();
    for (let i = 0; i < window.set.size; i++) {
      expect(window.set.has(window.res[i][0])).toBeTruthy();
      expect(window.set.has(window.res[i][1])).toBeTruthy();
      expect(window.res[i][2]).toBe(window.set);
    }
    const res = [];
    window.set.forEach((v, i, s) => res.push([v, i, s]));
    expect(window.res).toEqual(res);
  });
});
 