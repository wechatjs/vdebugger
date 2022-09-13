export default class Scope {
  static chain = [];
  static callFrameId = 0;
  static lastPop = null; // 记录一下最后被pop的scope

  constructor(scopeEval, scopeName) {
    this.eval = scopeEval;
    this.name = scopeName;
    this.callFrameId = scopeName ? ++Scope.callFrameId : Scope.callFrameId;
  }

  static getSpecifiedScope(check) {
    const chainLen = Scope.chain.length;
    let scope = Scope.chain[chainLen - 1];
    for (let i = chainLen - 1; i > -1; i--) {
      if (check(Scope.chain[i])) {
        scope = Scope.chain[i];
        break;
      }
    }
    return scope;
  }

  static getScopeByCallFrameId(callFrameId) {
    return Scope.getSpecifiedScope((scope) => scope.callFrameId === callFrameId);
  }

  static getCurrentCallFrameId() {
    const chainLen = Scope.chain.length;
    const scope = Scope.chain[chainLen - 1];
    return scope?.callFrameId;
  }

  static updateCallFrame(callFrame) {
    const scope = Scope.getSpecifiedScope((scope) => !!scope.name);
    if (scope) {
      scope.callFrame = callFrame;
    }
  }
}
