import { nodeResolve } from '@rollup/plugin-node-resolve';
import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';
import path from 'path';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/vdebugger.js',
    name: 'vDebugger',
    exports: 'named',
    format: 'umd',
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      },
    }),
    babel({
      babelHelpers: 'runtime',
      configFile: path.resolve(__dirname, './.babelrc'),
    }),
    json(),
  ],
}