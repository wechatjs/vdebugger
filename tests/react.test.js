/**
 * @jest-environment jsdom
 */

import axios from 'axios';
import vDebugger from '../src';
import { nextTick } from './utils';

describe('react tests', () => {
  let reactScript = '';
  let reactDomScript = '';

  beforeAll(async () => {
    const res = await axios('https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js');
    const res2 = await axios('https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.development.js');
    reactScript = res.data;
    reactDomScript = res2.data;
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('transform dependency normally', () => {
    const run = vDebugger.debug(reactScript, 'https://react.test/react.js');
    expect(run).toBeTruthy();
    run();
    const run2 = vDebugger.debug(reactDomScript, 'https://react.test/react-dom.js');
    expect(run2).toBeTruthy();
    run2();
  });

  it('render react app normally', async () => {
    const run = vDebugger.debug(
      "function App() {\n" +
      "  const [color, setColor] = React.useState(false);\n" +
      "  const boxStyle = { height: '100px', border: '1px solid red', background: color ? 'blue' : 'white' };\n" +
      "  const onClick = () => {\n" +
      "    setColor(c => !c);\n" + // 第5行，等下断在这里
      "  };\n" +
      "  return React.createElement('div', null, React.createElement('div', {\n" +
      "    id: 'box', className: 'box', style: boxStyle, onClick\n" +
      "  }));\n" +
      "}\n" +
      "ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(App));", 'https://react.test/index.js'
    );
    expect(run).toBeTruthy();
    run();

    await nextTick(); // react 18 createRoot 默认开启异步渲染，这里等一下渲染
    const box = document.getElementById('box');
    expect(box.style.backgroundColor).toBe('white');
  });

  it('emit react event normally', async () => {
    const box = document.getElementById('box');
    box.click();

    await nextTick();
    expect(box.style.backgroundColor).toBe('blue');
  });

  it('break react event handler normally', async () => {
    const breakLine = 5;
    vDebugger.setBreakpoint('https://react.test/index.js', breakLine);

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
