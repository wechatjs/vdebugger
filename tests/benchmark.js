const vDebugger = require('../dist/vdebugger');
const axios = require('axios');

(async () => {
  const res = await axios('https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js');

  console.time('evalTime');
  eval(res.data);
  console.timeEnd('evalTime');

  console.time('debugTime');
  const run = vDebugger.debug(res.data, 'https://react.test/react.js');
  run();
  console.timeEnd('debugTime');
})();