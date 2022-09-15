import { CLASS_CONSTRUCTOR_NAME, SANDBOX_PREFIX } from './consts';

const FUNC_MARK = `const ${CLASS_CONSTRUCTOR_NAME}`;
const funcToString = Function.prototype.toString;
const oriArrayMap = Array.prototype.map;
const oriArrayForEach = Array.prototype.forEach;
const oriArrayFilter = Array.prototype.filter;
const oriArrayReduce = Array.prototype.reduce;
const oriCustomElementDefine = typeof CustomElementRegistry === 'function' && CustomElementRegistry.prototype.define;

let hasWrappedProtoMethod = false;
export function wrapProtoMethod(executor) {
  if (hasWrappedProtoMethod) return;

  hasWrappedProtoMethod = true;

  Array.prototype.forEach = function forEach(iterator, thisArg) {
    if (funcToString.call(iterator).indexOf(FUNC_MARK) !== -1) {
      const retGenerator = oriArrayReduce.call(this, (prevGenerator, ...iteratorArgs) => {
        return (function* () {
          yield* prevGenerator;
          yield iterator.call(thisArg, ...iteratorArgs);
        })();
      }, (function* () {})());
      return executor(retGenerator);
    }
    return oriArrayForEach.call(this, iterator, thisArg);
  };

  Array.prototype.map = function map(mapper) {
    if (funcToString.call(mapper).indexOf(FUNC_MARK) !== -1) {
      const retGenerator = oriArrayReduce.call(this, (prevGenerator, ...mapperArgs) => {
        return (function* () {
          const prevRes = yield* prevGenerator;
          const mapperRes = yield mapper(...mapperArgs);
          prevRes.push(mapperRes);
          return prevRes;
        })();
      }, (function* () { return [] })());
      return executor(retGenerator);
    }
    return oriArrayMap.call(this, mapper);
  };

  Array.prototype.filter = function filter(filter, thisArg) {
    if (funcToString.call(filter).indexOf(FUNC_MARK) !== -1) {
      const retGenerator = oriArrayReduce.call(this, (prevGenerator, filterItem, ...filterRestArgs) => {
        return (function* () {
          const prevRes = yield* prevGenerator;
          const filterRes = yield filter.call(thisArg, filterItem, ...filterRestArgs);
          if (filterRes) {
            prevRes.push(filterItem);
          }
          return prevRes;
        })();
      }, (function* () { return [] })());
      return executor(retGenerator);
    }
    return oriArrayFilter.call(this, filter, thisArg);
  };

  Array.prototype.reduce = function reduce(reducer, init) {
    if (funcToString.call(reducer).indexOf(FUNC_MARK) !== -1) {
      const retGenerator = oriArrayReduce.call(this, (accumGenerator, ...reduceArgs) => {
        return (function* () {
          const accumRes = yield* accumGenerator;
          return yield reducer(accumRes, ...reduceArgs);
        })();
      }, (function* () { return init })());
      return executor(retGenerator);
    }
    return oriArrayReduce.call(this, reducer, init);
  };

  if (oriCustomElementDefine) {
    CustomElementRegistry.prototype.define = function define(tag, ctor) {
      ctor[CLASS_CONSTRUCTOR_NAME] = 1;
      return oriCustomElementDefine.call(this, tag, ctor);
    };
  }
}

const globalObjectCache = {};
export function switchGlobalObject() {
  [Promise, globalObjectCache.Promise] = [globalObjectCache.Promise || Promise, Promise];
}

export function switchObjectMethod(object, methodNameList) {
  oriArrayForEach.call(methodNameList, (methodName) => {
    if (methodName in object) {
      const switchName = `${SANDBOX_PREFIX}${methodName.toString()}`;
      const method = object[methodName];
      const switchMethod = object[switchName] || method;
      object[methodName] = switchMethod;
      Object.defineProperty(object, switchName, {
        value: method,
        writable: false,
        enumerable: false,
        configurable: true,
      });
    }
  });
}
