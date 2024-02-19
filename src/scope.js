export default class Scope {
  static chain = [];
  static callFrameId = 0;
  static lastPop = null; // 记录一下最后被pop的scope
  static curNamedScope = null; // 记录一下当前函数scope

  constructor(scopeEval, scopeName) {
    this.eval = scopeEval;
    this.name = scopeName;
    this.callFrameId = scopeName ? ++Scope.callFrameId : Scope.callFrameId;
  }

  static getSpecifiedScope(check) {
    const chain = Scope.chain;
    const len = chain.length;
    for (let i = len - 1; i !== -1; i--) {
      if (check(chain[i])) {
        return chain[i];
      }
    }
    return chain[len - 1];
  }

  static getScopeByCallFrameId(callFrameId) {
    return Scope.getSpecifiedScope((scope) => scope.callFrameId === callFrameId);
  }

  static getCurrentCallFrameId() {
    return Scope.chain[Scope.chain.length - 1]?.callFrameId;
  }

  static updateCallFrame(callFrame) {
    Scope.curNamedScope && (Scope.curNamedScope.callFrame = callFrame);
  }
}
