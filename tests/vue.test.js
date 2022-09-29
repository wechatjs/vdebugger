/**
 * @jest-environment jsdom
 */

import { nextTick } from './utils';
import vDebugger from '../src';
import axios from 'axios';

describe('vue2 tests', () => {
  let vueScript = '';

  beforeAll(async () => {
    const res = await axios('https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.esm.browser.min.js');
    vueScript = res.data;
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('transform dependency normally', () => {
    const run = vDebugger.debug(vueScript, 'https://vue2.test/vue.js');
    expect(run).toBeTruthy();
    run();
  });

  it('render vue app normally', () => {
    const run = vDebugger.debug(
      "import Vue from './vue.js';\n" +
      "new Vue({\n" +
      "  template: '<div>'\n" +
      "    + '<div id=\"box\" class=\"box\" :style=\"boxStyle\" @click=\"click\"></div>'\n" +
      "    + '</div>',\n" +
      "  data() {\n" +
      "    return {\n" +
      "      color: false\n" +
      "    };\n" +
      "  },\n" +
      "  computed: {\n" +
      "    boxStyle() {\n" +
      "      return {\n" +
      "        height: '100px',\n" +
      "        border: '1px solid red',\n" +
      "        background: this.color ? 'blue' : 'white'\n" +
      "      };\n" +
      "    }\n" +
      "  },\n" +
      "  methods: {\n" +
      "    click() {\n" +
      "      this.color = !this.color;\n" + // 第22行，等下断在这里
      "    }\n" +
      "  }\n" +
      "}).$mount('#app');", 'https://vue2.test/index.js'
    );
    expect(run).toBeTruthy();
    run();

    const box = document.getElementById('box');
    expect(box.style.backgroundColor).toBe('white');
  });

  it('emit vue event normally', async () => {
    const box = document.getElementById('box');
    box.click();

    await nextTick();
    expect(box.style.backgroundColor).toBe('blue');
  });

  it('break vue event handler normally', async () => {
    const breakLine = 22;
    vDebugger.setBreakpoint('https://vue2.test/index.js', breakLine);

    const box = document.getElementById('box');
    box.click();

    await nextTick();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(breakLine);
    expect(box.style.backgroundColor).toBe('blue');

    const resumeRes = vDebugger.resume();
    expect(resumeRes).toBeTruthy();

    await nextTick();
    const pausedInfo2 = vDebugger.getPausedInfo();
    expect(pausedInfo2).toBeFalsy();
    expect(box.style.backgroundColor).toBe('white');
  });
});

describe('vue3 tests', () => {
  let vueScript = '';

  beforeAll(async () => {
    const res = await axios('https://cdn.jsdelivr.net/npm/vue@3.2.37/dist/vue.esm-browser.prod.js');
    vueScript = res.data;
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('transform dependency normally', () => {
    const run = vDebugger.debug(vueScript, 'https://vue3.test/vue.js');
    expect(run).toBeTruthy();
    run();
  });

  it('render vue app normally', () => {
    const run = vDebugger.debug(
      "import { createApp, nextTick } from './vue.js';\n" +
      "createApp({\n" +
      "  template: '<div>'\n" +
      "    + '<div id=\"box\" class=\"box\" :style=\"boxStyle\" @click=\"click\"></div>'\n" +
      "    + '</div>',\n" +
      "  data() {\n" +
      "    return {\n" +
      "      color: false\n" +
      "    };\n" +
      "  },\n" +
      "  computed: {\n" +
      "    boxStyle() {\n" +
      "      return {\n" +
      "        height: '100px',\n" +
      "        border: '1px solid red',\n" +
      "        background: this.color ? 'blue' : 'white'\n" +
      "      };\n" +
      "    }\n" +
      "  },\n" +
      "  methods: {\n" +
      "    click() {\n" +
      "      this.color = !this.color;\n" + // 第22行，等下断在这里
      "    }\n" +
      "  }\n" +
      "}).mount('#app');", 'https://vue3.test/index.js'
    );
    expect(run).toBeTruthy();
    run();

    const box = document.getElementById('box');
    expect(box.style.backgroundColor).toBe('white');
  });

  it('emit vue event normally', async () => {
    const box = document.getElementById('box');
    box.click();

    await nextTick();
    expect(box.style.backgroundColor).toBe('blue');
  });

  it('break vue event handler normally', async () => {
    const breakLine = 22;
    vDebugger.setBreakpoint('https://vue3.test/index.js', breakLine);

    const box = document.getElementById('box');
    box.click();

    await nextTick();
    const pausedInfo = vDebugger.getPausedInfo();
    expect(pausedInfo).toBeTruthy();
    expect(pausedInfo.lineNumber).toEqual(breakLine);
    expect(box.style.backgroundColor).toBe('blue');

    const resumeRes = vDebugger.resume();
    expect(resumeRes).toBeTruthy();

    await nextTick();
    const pausedInfo2 = vDebugger.getPausedInfo();
    expect(pausedInfo2).toBeFalsy();
    expect(box.style.backgroundColor).toBe('white');
  });
});
