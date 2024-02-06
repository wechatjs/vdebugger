const vDebugger = require('../dist/vdebugger');
const axios = require('axios');

const code = `
for (let i = 0; i < 10000; i++) {
  i = i;
}
`;

console.time('evalTime-for');
eval(code);
console.timeEnd('evalTime-for');

const run = vDebugger.debug(code, 'for');
console.time('debugTime-for');
run();
console.timeEnd('debugTime-for');

(async () => {
  const res = await axios('https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js');

  console.time('evalTime-react');
  eval(res.data);
  console.timeEnd('evalTime-react');

  const run = vDebugger.debug(res.data, 'react');
  console.time('debugTime-react');
  run();
  console.timeEnd('debugTime-react');
})();