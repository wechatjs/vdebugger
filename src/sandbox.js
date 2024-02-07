import { CLASS_CONSTRUCTOR_NAME, SANDBOX_PREFIX } from './consts';

const FUNC_MARK = `const ${CLASS_CONSTRUCTOR_NAME}`;
const funcToString = Function.prototype.toString;
const oriArrayFrom = Array.from;
const oriArrayMap = Array.prototype.map;
const oriArrayForEach = Array.prototype.forEach;
const oriArrayFilter = Array.prototype.filter;
const oriArrayReduce = Array.prototype.reduce;
const oriArrayReduceRight = Array.prototype.reduceRight;
const oriArrayEvery = Array.prototype.every;
const oriArraySome = Array.prototype.some;
const oriArraySort = Array.prototype.sort;
const oriArrayFind = Array.prototype.find;
const oriArrayFindIndex = Array.prototype.findIndex;
const oriArrayConcat = Array.prototype.concat;
const oriArrayFlatMap = Array.prototype.flatMap;
const oriStringReplace = String.prototype.replace;
const oriStringReplaceAll = String.prototype.replaceAll;
const oriMapForEach = Map.prototype.forEach;
const oriSetForEach = Set.prototype.forEach;
const oriCustomElementDefine = typeof CustomElementRegistry === 'function' && CustomElementRegistry.prototype.define;

let hasWrappedProtoMethod = false;
export function wrapProtoMethod(executor) {
  if (hasWrappedProtoMethod) return;

  hasWrappedProtoMethod = true;

  Array.from = function from(arrayLike, mapper, thisArg) {
    if (typeof mapper === 'function' && funcToString.call(mapper).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        const result = [];
        for (let i = 0; i < array.length; i++) result.push(yield mapper.call(thisArg, array[i], i, array));
        return result;
      })(oriArrayFrom(arrayLike)));
    }
    return oriArrayFrom(arrayLike, mapper, thisArg);
  };

  Array.prototype.forEach = function forEach(iterator, thisArg) {
    if (typeof iterator === 'function' && funcToString.call(iterator).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        for (let i = 0; i < array.length; i++) yield iterator.call(thisArg, array[i], i, array);
      })(this));
    }
    return oriArrayForEach.call(this, iterator, thisArg);
  };

  Array.prototype.map = function map(mapper, thisArg) {
    if (typeof mapper === 'function' && funcToString.call(mapper).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        const result = [];
        for (let i = 0; i < array.length; i++) result.push(yield mapper.call(thisArg, array[i], i, array));
        return result;
      })(this));
    }
    return oriArrayMap.call(this, mapper, thisArg);
  };

  Array.prototype.filter = function filter(filter, thisArg) {
    if (typeof filter === 'function' && funcToString.call(filter).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        const result = [];
        for (let i = 0; i < array.length; i++) (yield filter.call(thisArg, array[i], i, array)) && result.push(array[i]);
        return result;
      })(this));
    }
    return oriArrayFilter.call(this, filter, thisArg);
  };

  Array.prototype.reduce = function reduce(reducer, init) {
    if (typeof reducer === 'function' && funcToString.call(reducer).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        let result = init;
        for (let i = 0; i < array.length; i++) result = yield reducer(result, array[i], i, array);
        return result;
      })(this));
    }
    return oriArrayReduce.call(this, reducer, init);
  };

  Array.prototype.reduceRight = function reduceRight(reducer, init) {
    if (typeof reducer === 'function' && funcToString.call(reducer).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        let result = init;
        for (let i = array.length - 1; i !== -1; i--) result = yield reducer(result, array[i], i, array);
        return result;
      })(this));
    }
    return oriArrayReduceRight.call(this, reducer, init);
  };

  Array.prototype.every = function every(predicate, thisArg) {
    if (typeof predicate === 'function' && funcToString.call(predicate).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        for (let i = 0; i < array.length; i++) {
          if (!(yield predicate.call(thisArg, array[i], i, array))) return false;
        }
        return true;
      })(this));
    }
    return oriArrayEvery.call(this, predicate, thisArg);
  };

  Array.prototype.some = function some(predicate, thisArg) {
    if (typeof predicate === 'function' && funcToString.call(predicate).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        for (let i = 0; i < array.length; i++) {
          if (yield predicate.call(thisArg, array[i], i, array)) return true;
        }
        return false;
      })(this));
    }
    return oriArraySome.call(this, predicate, thisArg);
  };

  Array.prototype.sort = function sort(compare) {
    if (typeof compare === 'function' && funcToString.call(compare).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        // EMCA规定sort必须稳定，V8使用了timsort，这边简单处理，统一用归并排序
        function* sort(arr, l, r) {
          if (l >= r) return;
          const mid = l + Math.floor((r - l) / 2);
          yield* sort(arr, l, mid);
          yield* sort(arr, mid + 1, r);
          const res = yield compare(arr[mid], arr[mid + 1]);
          if (typeof res === 'number' && res > 0) {
            for (let k = l, i = l, j = mid + 1, aux = arr.slice(l, r + 1); k <= r; k++) {
              if (i > mid) arr[k] = aux[j++ - l];
              else if (j > r) arr[k] = aux[i++ - l];
              else {
                const res = yield compare(aux[i - l], aux[j - l]);
                if (typeof res === 'number' && res > 0) arr[k] = aux[j++ - l];
                else arr[k] = aux[i++ - l];
              }
            }
          }
        }
        yield* sort(array, 0, array.length - 1);
        return array;
      })(this));
    }
    return oriArraySort.call(this, compare);
  };

  Array.prototype.find = function find(predicate, thisArg) {
    if (typeof predicate === 'function' && funcToString.call(predicate).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        for (let i = 0; i < array.length; i++) {
          if (yield predicate.call(thisArg, array[i], i, array)) return array[i];
        }
      })(this));
    }
    return oriArrayFind.call(this, predicate, thisArg);
  };

  Array.prototype.findIndex = function findIndex(predicate, thisArg) {
    if (typeof predicate === 'function' && funcToString.call(predicate).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        for (let i = 0; i < array.length; i++) {
          if (yield predicate.call(thisArg, array[i], i, array)) return i;
        }
      })(this));
    }
    return oriArrayFindIndex.call(this, predicate, thisArg);
  };

  oriArrayFlatMap && (Array.prototype.flatMap = function map(mapper, thisArg) {
    if (typeof mapper === 'function' && funcToString.call(mapper).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (array) {
        const result = [];
        for (let i = 0; i < array.length; i++) result.push(yield mapper.call(thisArg, array[i], i, array));
        return oriArrayConcat.apply([], result);
      })(this));
    }
    return oriArrayFlatMap.call(this, mapper, thisArg);
  });

  // Array.prototype.findLast
  // Array.prototype.findLastIndex
  // Array.prototype.group
  // Array.prototype.groupToMap

  const replaceString = (string, search, replacer, global) => {
    const reg = typeof search === 'string' ? search : new RegExp(search.source, oriStringReplace.call(search.flags, 'g', ''));
    return executor((function* () {
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
      } while (search.global || global)
      result += string.substring(index);
      return result;
    })());
  };

  String.prototype.replace = function replace(search, replacer) {
    if (typeof replacer === 'function' && funcToString.call(replacer).indexOf(FUNC_MARK) !== -1) {
      if (typeof search === 'string' || search instanceof RegExp) {
        return replaceString(this, search, replacer);
      }
    }
    return oriStringReplace.call(this, search, replacer);
  };

  String.prototype.replaceAll && (String.prototype.replaceAll = function replaceAll(search, replacer) {
    if (typeof replacer === 'function' && funcToString.call(replacer).indexOf(FUNC_MARK) !== -1) {
      if (typeof search === 'string' || search instanceof RegExp) {
        if (search instanceof RegExp && search.flags.indexOf('g') === -1) {
          throw new TypeError('String.prototype.replaceAll called with a non-global RegExp argument');
        }
        return replaceString(this, search, replacer, true);
      }
    }
    return oriStringReplaceAll.call(this, search, replacer);
  });

  Map.prototype.forEach = function forEach(iterator, thisArg) {
    if (typeof iterator === 'function' && funcToString.call(iterator).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (map) {
        const entries = oriArrayFrom(map);
        for (let i = 0; i < entries.length; i++) yield iterator.call(thisArg, entries[i][1], entries[i][0], map);
      })(this));
    }
    return oriMapForEach.call(this, iterator, thisArg);
  };

  Set.prototype.forEach = function forEach(iterator, thisArg) {
    if (typeof iterator === 'function' && funcToString.call(iterator).indexOf(FUNC_MARK) !== -1) {
      return executor((function* (set) {
        const values = oriArrayFrom(set);
        for (let i = 0; i < values.length; i++) yield iterator.call(thisArg, values[i], values[i], set);
      })(this));
    }
    return oriSetForEach.call(this, iterator, thisArg);
  };

  oriCustomElementDefine && (CustomElementRegistry.prototype.define = function define(_, ctor) {
    typeof ctor === 'function' && (ctor[CLASS_CONSTRUCTOR_NAME] = 1);
    return oriCustomElementDefine.apply(this, arguments);
  });
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
