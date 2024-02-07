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
    for (let i = Scope.chain.length - 1; i !== -1; i--) {
      if (check(Scope.chain[i])) {
        return Scope.chain[i];
      }
    }
  }

  static getScopeByCallFrameId(callFrameId) {
    return Scope.getSpecifiedScope((scope) => scope.callFrameId === callFrameId);
  }

  static getCurrentCallFrameId() {
    return Scope.chain[Scope.chain.length - 1]?.callFrameId;
  }

  static updateCallFrame(callFrame) {
    const scope = Scope.curNamedScope || Scope.getSpecifiedScope((scope) => !!scope.name);
    if (scope) {
      scope.callFrame = callFrame;
      Scope.curNamedScope = scope;
    }
  }
}
