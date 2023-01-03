type ResumeType = 'stepInto' | 'stepOver' | 'stepOut'
interface Breakpoint { id: number, lineNumber: number }
interface CallFrame { debuggerId: string, lineNumber: number, columnNumber: number }
interface Scope { eval: (expression: string) => any, name: string, callFrameId: number, callFrame?: CallFrame }
interface ErrorInfo { error: Error, scopeChain: Scope[] }
interface SandboxInfo { enable: boolean }
interface PausedInfo {
  breakpointId?: number,
  reason?: string,
  data?: any,
  debuggerId: string,
  lineNumber: number,
  columnNumber: number,
  scopeChain: Scope[],
  scriptContent: string,
}
interface EventListener {
  resumed: () => void,
  paused: (pausedInfo: PausedInfo) => void,
  error: (errorInfo: ErrorInfo) => void,
  sandboxchange: (sandboxInfo: SandboxInfo) => void,
}

export declare const version: string
export declare function debug(script: string, debuggerId?: string): (() => void) | false
export declare function transform(script: string, debuggerId?: string): string | false
export declare function resume(type?: ResumeType): boolean
export declare function evaluate<Result = unknown>(expression: string, callFrameId?: number): Result | false
export declare function setBreakpoint(debuggerId: string, lineNumber: number, condition?: string): Breakpoint | false
export declare function setBreakpoint(debuggerId: string, lineNumber: number, columnNumber: number, condition?: string): Breakpoint | false
export declare function removeBreakpoint(id: number): boolean
export declare function setBreakpointsActive(value: boolean): boolean
export declare function setExecutionPause(value: boolean): boolean
export declare function setExceptionPause(value: boolean): boolean
export declare function getPausedInfo(): PausedInfo | false
export declare function getScopeChain(): Scope[]
export declare function getScriptContent(debuggerId: string): string
export declare function runInNativeEnv<Return>(callback: () => Return): Return | false
export declare function runInSkipOver<Return>(callback: () => Return): Return | false
export declare function setModuleRequest(request: (importUrl: string) => Promise<string>): boolean
export declare function addEventListener<Event extends keyof EventListener>(event: Event, listener: EventListener[Event]): boolean
export declare function removeEventListener<Event extends keyof EventListener>(event: Event, listener: EventListener[Event]): boolean

declare const vDebugger: {
  version: typeof version,
  debug: typeof debug,
  transform: typeof transform,
  resume: typeof resume,
  evaluate: typeof evaluate,
  setBreakpoint: typeof setBreakpoint,
  removeBreakpoint: typeof removeBreakpoint,
  setBreakpointsActive: typeof setBreakpointsActive,
  setExecutionPause: typeof setExecutionPause,
  setExceptionPause: typeof setExceptionPause,
  getPausedInfo: typeof getPausedInfo,
  getScopeChain: typeof getScopeChain,
  getScriptContent: typeof getScriptContent,
  runInNativeEnv: typeof runInNativeEnv,
  runInSkipOver: typeof runInSkipOver,
  setModuleRequest: typeof setModuleRequest,
  addEventListener: typeof addEventListener,
  removeEventListener: typeof removeEventListener,
}

export default vDebugger
