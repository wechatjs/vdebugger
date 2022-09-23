import { CLASS_CONSTRUCTOR_NAME, SANDBOX_PREFIX } from './consts';

const FUNC_MARK = `const ${CLASS_CONSTRUCTOR_NAME}`;
const funcToString = Function.prototype.toString;
const oriArrayMap = Array.prototype.map;
const oriArrayForEach = Array.prototype.forEach;
const oriArrayFilter = Array.prototype.filter;
const oriArrayReduce = Array.prototype.reduce;
const oriStringReplace = String.prototype.replace;
const oriCustomElementDefine = typeof CustomElementRegistry === 'function' && CustomElementRegistry.prototype.define;

let hasWrappedProtoMethod = false;
export function wrapProtoMethod(executor) {
  if (hasWrappedProtoMethod) return;

  hasWrappedProtoMethod = true;

  Array.prototype.forEach = function forEach(iterator, thisArg) {
    if (funcToString.call(iterator).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        for (let i = 0; i < array.length; i++) yield iterator.call(thisArg, array[i], i, array);
      })(this));
    }
    return oriArrayForEach.call(this, iterator, thisArg);
  };

  Array.prototype.map = function map(mapper) {
    if (funcToString.call(mapper).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        const result = [];
        for (let i = 0; i < array.length; i++) result.push(yield mapper(array[i], i, array));
        return result;
      })(this));
    }
    return oriArrayMap.call(this, mapper);
  };

  Array.prototype.filter = function filter(filter, thisArg) {
    if (funcToString.call(filter).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        const result = [];
        for (let i = 0; i < array.length; i++) (yield filter.call(thisArg, array[i], i, array)) && result.push(array[i]);
        return result;
      })(this));
    }
    return oriArrayFilter.call(this, filter, thisArg);
  };

  Array.prototype.reduce = function reduce(reducer, init) {
    if (funcToString.call(reducer).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        let result = init;
        for (let i = 0; i < array.length; i++) result = yield reducer(result, array[i], i, array);
        return result;
      })(this));
    }
    return oriArrayReduce.call(this, reducer, init);
  };

  String.prototype.replace = function replace(search, replacer) {
    if (typeof replacer === 'function' && funcToString.call(replacer).indexOf(FUNC_MARK) !== -1) {
      if (typeof search === 'string' || search instanceof RegExp) {
        const reg = typeof search === 'string' ? search : new RegExp(search.source, oriStringReplace.call(search.flags, 'g', ''));
        return executor((function* (string) {
          let index = 0;
          let result = '';
          do {
            const rest = string.substring(index);
            const match = rest.match(reg);
            if (match) {
              const restIndex = match.index;
              match.index += index;
              match.input = string;
              result += rest.substring(0, restIndex) + (yield replacer(...match, match.index, string));
              index = match.index + match[0].length;
            } else break;
          } while (search.global)
          result += string.substring(index);
          return result;
        })(this));
      }
    }
    return oriStringReplace.call(this, search, replacer);
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
