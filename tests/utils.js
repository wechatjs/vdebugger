/* istanbul ignore file */

// 测试环境没有replaceAll，补一个超简单的实现，保证可以走到相应的逻辑
String.prototype.replaceAll = function replace(search, replacer) {
  return this.replace(new RegExp(search, 'g'), replacer);
};

export const nextTick = () => new Promise((resolve) => setTimeout(resolve));
