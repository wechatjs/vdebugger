import { parse } from 'meriyah';
import { generate } from 'astring';
import { ancestor } from 'acorn-walk';
import {
  EXECUTOR_FUNC_NAME,
  EXECUTOR_BREAK_NAME,
  IMPORT_REQ_NAME,
  IMPORT_FUNC_NAME,
  EXPORT_OBJECT_NAME,
  TMP_VARIABLE_NAME,
  DEBUGGER_ID_NAME,
  SCOPE_TRACER_NAME,
  CLASS_CONSTRUCTOR_NAME,
  CLASS_CREATE_NAME,
  VALUE_SETTER_NAME,
  IMPORT_META_NAME,
  NEW_TARGET_NAME,
} from './consts';

export default class Transformer {
  static breakpointId = 1;
  static breakpointMap = new Map();

  debuggerId = '';
  scriptContent = '';
  importNodeList = [];
  exportDeclarationNodeList = [];
  lineBreakpointIdsMap = new Map();

  constructor(debuggerId) {
    this.debuggerId = debuggerId || Transformer.genTmpDebuggerId();
  }

  // 生成临时debuggerId
  static genTmpDebuggerId() {
    return 'VM' + parseInt(Math.random() * 100000);
  }

  /**
   * 转换代码，进行插桩、处理ESModule语句等操作
   * @param {String} scriptContent 源码
   */
  run(scriptContent) {
    // 保存源码信息
    this.scriptContent = scriptContent;

    // 生成ast
    const ast = parse(scriptContent, { module: true, loc: true });

    // 插入断点检查函数
    ancestor(ast, {
      DebuggerStatement: (node) => {
        // 对debugger语句插入断点
        Object.assign(node, this.createExpressionStatement(
          this.createBreakpointExpression(node)
        ));
        const breakpointId = node?.expression?.expressions?.[0]?.left?.right.arguments?.[1]?.value;
        if (breakpointId) {
          Transformer.breakpointMap.set(breakpointId, true);
        }
      },
      Program: (node) => {
        // 转换程序入口，插入断点
        this.transformProgram(node);
      },
      BlockStatement: (node, ancestors) => {
        // 转换块级语句，插入断点并记录作用域链
        this.transformBlockStatement(node, ancestors);
      },
      AssignmentExpression: (node) => {
        // 转换赋值表达式，保证setter在协程中顺序执行
        this.transformAssignmentExpression(node);
      },
      FunctionDeclaration: (node) => {
        // 转换函数声明，同时支持断点以及new创建实例
        this.transformFunction(node);
      },
      FunctionExpression: (node) => {
        // 转换函数表达式，同时支持断点以及new创建
        this.transformFunction(node);
      },
      ArrowFunctionExpression: (node) => {
        // 把所有箭头函数表达式改成generator
        this.transformFunction(node);
      },
      CallExpression: (node, ancestors) => {
        // 对于被debugger转换成generator函数的调用，套一层yield语句
        this.transformCallExpression(node, ancestors);
      },
      MemberExpression: (node, ancestors) => {
        // 对于被debugger转换成generator函数的调用，套一层yield语句
        this.transformMemberExpression(node, ancestors);
      },
      ClassBody: (node, ancestors) => {
        // 因为class constructor要求同步执行，这里对constructor进行转换一下，变成generator，搭配NewExpression转换使用
        this.transformClass(node, ancestors);
      },
      ThisExpression: (node) => {
        Object.assign(node, this.createIdentifier(TMP_VARIABLE_NAME + 't'));
      },
      Identifier: (node) => {
        if (node.name === 'arguments') {
          node.name = TMP_VARIABLE_NAME + 'a';
        }
      },
      NewExpression: (node) => {
        // 因为class constructor要求同步执行，上面对constructor转换成了generator，因此这里需要转换一下，主动调用这个迭代器
        this.transformNewExpression(node);
      },
      ImportDeclaration: (node) => {
        // 转换import声明为自己实现的import，代理import行为
        this.transformImportDeclaration(node);
        this.importNodeList.push(node);
      },
      ImportExpression: (node) => {
        // 转换动态import表达式为自己实现的import，代理import行为
        this.transformImportExpression(node);
      },
      ExportDefaultDeclaration: (node) => {
        // 转换默认export声明来代理export行为
        this.transformExportDefaultDeclaration(node);
      },
      ExportNamedDeclaration: (node) => {
        // 转换具名export声明来代理export行为
        this.transformExportNamedDeclaration(node);
      },
      ExportAllDeclaration: (node) => {
        // 转换全导出export声明来代理export行为
        this.transformExportAllDeclaration(node);
      },
      MetaProperty: (node) => {
        // 转换import.meta
        this.transformMetaProperty(node);
      },
    });

    // 处理全局信息
    this.transformGlobalInfo(ast);

    // 重新生成代码
    return '[function*(' +
      `${EXECUTOR_BREAK_NAME},${EXECUTOR_FUNC_NAME},${SCOPE_TRACER_NAME},${VALUE_SETTER_NAME},` +
      `${CLASS_CREATE_NAME},${IMPORT_REQ_NAME},${IMPORT_FUNC_NAME}` +
    '){' +
      'try{' +
        'return yield* (function* () {' +
          `${SCOPE_TRACER_NAME}(true,x=>eval(x),'(global)');` +
          `let ${TMP_VARIABLE_NAME}o,${TMP_VARIABLE_NAME}f,${TMP_VARIABLE_NAME}y;` +
          `${generate(ast, process.env.NODE_ENV === 'production' ? { indent: '', lineEnd: '' } : {})}` +
        '})()' +
      '}finally{' +
        `${SCOPE_TRACER_NAME}(false)` +
      '}' +
    '}]';
  }

  // 创建export赋值表达式AST节点
  createExportAssginmentExpression(exportIdentifier, exportNameIdentifier, declaration) {
    return this.createAssignmentExpression(
      this.createMemberExpression(
        exportIdentifier,
        exportNameIdentifier
      ),
      declaration
    );
  }

  // 创建module请求语句AST节点
  createModuleRequestStatement() {
    return this.createExpressionStatement(
      this.createYieldExpression(
        this.createCallExpression(
          this.createIdentifier(IMPORT_REQ_NAME), [
            this.createArrayExpression(
              this.importNodeList.map((node) => node.source)
            ),
            this.createIdentifier(DEBUGGER_ID_NAME)
          ]
        ), false
      )
    )
  }

  // 创建import表达式AST节点
  createImportCallExpression(source, dynamic) {
    const args = [source, this.createIdentifier(DEBUGGER_ID_NAME)];
    if (dynamic) {
      args.push(this.createLiteral(true));
    }
    return this.createCallExpression(
      this.createIdentifier(IMPORT_FUNC_NAME), args
    );
  }

  // 创建断点的AST节点
  createBreakpointExpression(node, blocker) {
    const breakpointId = Transformer.breakpointId++;
    const params = [
      this.createIdentifier(DEBUGGER_ID_NAME),
      this.createLiteral(breakpointId),
      this.createLiteral(node.loc.start.line),
      this.createLiteral(node.loc.start.column)
    ];
    if (blocker) {
      params.push(this.createLiteral(1));
    } else {
      const lineBreakpointIds = this.lineBreakpointIdsMap.get(node.loc.start.line);
      if (lineBreakpointIds) {
        lineBreakpointIds[node.loc.start.column] = breakpointId;
      } else {
        this.lineBreakpointIdsMap.set(node.loc.start.line, {
          [node.loc.start.column]: breakpointId
        });
      }
    }
    const tmpYieldIdentifier = this.createIdentifier(TMP_VARIABLE_NAME + 'y');
    return this.createSequenceExpression([
      this.createLogicalExpression(
        this.createAssignmentExpression(
          tmpYieldIdentifier,
          this.createCallExpression(
            this.createIdentifier(EXECUTOR_BREAK_NAME),
            params
          )
        ),
        '&&', this.createYieldExpression(tmpYieldIdentifier, false)
      )
    ]);
  }

  // 创建作用域所需变量声明
  createScopeVariableDeclarators() {
    return [
      this.createVariableDeclarator(this.createIdentifier(TMP_VARIABLE_NAME), null),
      this.createVariableDeclarator(this.createIdentifier(TMP_VARIABLE_NAME + 't'), this.createThisExpression()),
      this.createVariableDeclarator(this.createIdentifier(TMP_VARIABLE_NAME + 'a'), this.createIdentifier('arguments')),
      this.createVariableDeclarator(this.createIdentifier(NEW_TARGET_NAME),
        this.createMetaProperty(this.createIdentifier('new'), this.createIdentifier('target'))
      )
    ];
  }

  // 转换入口，插入断点
  transformProgram(node) {
    node.body = [].concat(...node.body.map((bodyNode) => [
      // 给每个语句前都插入断点
      this.createExpressionStatement(
        this.createBreakpointExpression(bodyNode)
      ),
      bodyNode
    ]));
  }

  // 转换块级语句，插入断点，记录scope eval等信息
  transformBlockStatement(node, ancestors) {
    const parentNode = ancestors[ancestors.length - 2];
    const grandParentNode = ancestors[ancestors.length - 3];
    const isFunction = parentNode?.type.indexOf('Function') !== -1;
    const undefinedIdentifier = this.createIdentifier('undefined');
    const assignmentPatternParamsDeclarators = [];
    let scopeNameIdentifier = undefinedIdentifier;
    if (isFunction) {
      scopeNameIdentifier = this.createLiteral('(anonymous)');
      if (parentNode.id?.name) {
        scopeNameIdentifier = this.createLiteral(parentNode.id?.name);
      } else if (grandParentNode?.key?.name) {
        scopeNameIdentifier = this.createLiteral(grandParentNode?.key?.name);
      }
      parentNode.params.forEach((p, i) => {
        if (p.type === 'AssignmentPattern') {
          const paramIdentifier = this.createIdentifier(TMP_VARIABLE_NAME + 'a' + i);
          assignmentPatternParamsDeclarators.push(
            this.createVariableDeclarator(
              p.left,
              this.createConditionalExpression(
                this.createBinaryExpression(paramIdentifier, '===', undefinedIdentifier),
                p.right, paramIdentifier
              )
            )
          );
          Object.assign(p, paramIdentifier);
        }
      });
    }
    const scopeInitCallExpr = this.createCallExpression(
      this.createIdentifier(SCOPE_TRACER_NAME),
      [
        this.createLiteral(true),
        this.createFunctionExpression(
          this.createCallExpression(
            this.createIdentifier('eval'),
            [this.createIdentifier('x')]
          ),
          [this.createIdentifier('x')],
          'ArrowFunctionExpression', false
        ),
        scopeNameIdentifier
      ]
    );
    const cookedBody = [
      ...(
        assignmentPatternParamsDeclarators.length
          ? [this.createVariableDeclaration('let', assignmentPatternParamsDeclarators)]
          : []
      ),
      this.createExpressionStatement(
        isFunction ? this.createSequenceExpression([
          this.createBreakpointExpression(node, true),
          scopeInitCallExpr
        ]) : scopeInitCallExpr
      )
    ].concat(...node.body.map((bodyNode) => [
      // 给每个语句前都插入断点
      this.createExpressionStatement(
        this.createBreakpointExpression(bodyNode)
      ),
      bodyNode
    ]));
    node.body = isFunction ? cookedBody : [
      this.createTryStatement(
        this.createBlockStatement(cookedBody),
        null,
        this.createBlockStatement([
          this.createExpressionStatement(
            this.createCallExpression(
              this.createIdentifier(SCOPE_TRACER_NAME),
              [this.createLiteral(false)]
            )
          )
        ])
      )
    ];
  }

  // 转换赋值表达式，保证setter在协程中顺序执行，将赋值表达式后面的语句阻塞
  transformAssignmentExpression(node) {
    const operator = node.operator.substring(0, node.operator.length - 1);
    if (operator) {
      node.right = this.createBinaryExpression(
        this.createYieldExpression(Object.assign({}, node.left), false),
        operator,
        Object.assign({}, node.right)
      );
    }
    node.operator = '=';
    if (node.left.type === 'MemberExpression') {
      const key = !node.left.computed && node.left.property.type === 'Identifier' ? this.createLiteral(node.left.property.name): node.left.property;
      Object.assign(node, this.createYieldExpression(
        this.createCallExpression(
          this.createIdentifier(VALUE_SETTER_NAME),
          [node.left.object, key, node.right]
        ), false
      ));
    }
  }

  // 转换属性访问，探寻是否是debugger转换的generator函数，如果是加上yield
  transformMemberExpression(node, ancestors) {
    const parentNode = ancestors[ancestors.length - 2];
    if (parentNode.type === 'AssignmentExpression' && parentNode.left === node) {
      // 左值，不处理
      return;
    }
    if (parentNode.type === 'UnaryExpression' && parentNode.operator === 'delete') {
      // delete操作，不处理
      return;
    }
    if (ancestors.find((a) => a.type === 'AssignmentPattern' || a.type === 'ArrayPattern')) {
      // 解构，暂时不处理
      return;
    }
    if (parentNode.type === 'CallExpression' && parentNode.callee === node) {
      if (node.object?.name === 'Reflect' && node.property?.name === 'construct') {
        Object.assign(parentNode, this.createYieldExpression(
          this.createCallExpression(
            this.createIdentifier(CLASS_CREATE_NAME),
            parentNode.arguments
          ))
        );
        return;
      }
      const tmpObjIdentifier = this.createIdentifier(TMP_VARIABLE_NAME + 'o');
      const tmpFuncIdentifier = this.createIdentifier(TMP_VARIABLE_NAME + 'f');
      Object.assign(parentNode, this.createSequenceExpression([
        this.createAssignmentExpression(
          tmpObjIdentifier,
          node.object
        ),
        this.createAssignmentExpression(
          tmpFuncIdentifier,
          this.createYieldExpression(Object.assign({}, node, { object: tmpObjIdentifier }), false)
        ),
        this.createCallExpression(
          this.createCallExpression(
            this.createMemberExpression(
              tmpFuncIdentifier,
              this.createIdentifier('bind')
            ),
            [tmpObjIdentifier]
          ),
          parentNode.arguments
        )
      ]));
      return;
    }
    if (parentNode.type === 'UpdateExpression') {
      if (parentNode.prefix) {
        Object.assign(parentNode, this.createAssignmentExpression(
          node,
          this.createBinaryExpression(
            this.createYieldExpression(Object.assign({}, node), false),
            parentNode.operator.slice(0, 1),
            this.createLiteral(1)
          )
        ));
      } else {
        const tmpObjIdentifier = this.createIdentifier(TMP_VARIABLE_NAME + 'o');
        Object.assign(parentNode, this.createSequenceExpression([
          this.createAssignmentExpression(
            tmpObjIdentifier,
            this.createYieldExpression(Object.assign({}, node), false)
          ),
          this.createAssignmentExpression(
            node,
            this.createBinaryExpression(
              tmpObjIdentifier,
              parentNode.operator.slice(0, 1),
              this.createLiteral(1)
            )
          ),
          tmpObjIdentifier
        ]));
      }
      return;
    }
    Object.assign(node, this.createSequenceExpression([
      this.createYieldExpression(Object.assign({}, node), false)
    ]));
  }

  // 转换函数调用
  transformCallExpression(node, ancestors) {
    if (node.type === 'YieldExpression') {
      // 如果已经被转换成yield了，就不用再处理了
      return;
    }
    if (node.callee.type === 'Super') {
      // 由于class constructor转换了，所以无法直接调用super构造函数，这里也转换一下，主动调用父类相应的generator
      node.callee = this.createMemberExpression(node.callee, this.createIdentifier(CLASS_CONSTRUCTOR_NAME));
      Object.assign(node, this.createYieldExpression(Object.assign({}, node)));
      return;
    }
    const parentNode = ancestors[ancestors.length - 2];
    if (parentNode.type === 'ChainExpression') {
      Object.assign(parentNode, this.createYieldExpression(Object.assign({}, parentNode), false));
      return;
    }
    Object.assign(node, this.createYieldExpression(Object.assign({}, node), false));
  }

  // 转换function
  transformFunction(node) {
    const thisIdentifier = this.createIdentifier(TMP_VARIABLE_NAME + 't');
    const ctorIdentifier = this.createIdentifier(CLASS_CONSTRUCTOR_NAME);
    const nwTgIdentifier = this.createIdentifier(NEW_TARGET_NAME);
    const functionBody = node.body.type === 'BlockStatement'
      ? node.body
      : this.createBlockStatement([
          this.createReturnStatement(node.body)
        ]);
    const returnCall = this.createReturnStatement(
      this.createYieldExpression(
        this.createCallExpression(
          this.createMemberExpression(
            ctorIdentifier,
            this.createIdentifier('call')
          ), [thisIdentifier]
        )
      )
    );
    node.expression = false;
    node.body = this.createBlockStatement([
      this.createVariableDeclaration('let', this.createScopeVariableDeclarators()),
      this.createVariableDeclaration('const', [
        this.createVariableDeclarator(
          ctorIdentifier,
          this.createFunctionExpression(functionBody, [], 'FunctionExpression', true, node.async)
        )
      ]),
      this.createReturnStatement(
        this.createConditionalExpression(
          this.createLogicalExpression(
            nwTgIdentifier, '&&',
            this.createUnaryExpression(
              this.createMemberExpression(
                nwTgIdentifier,
                ctorIdentifier
              ), '!'
            )
          ),
          this.createSequenceExpression([
            this.createAssignmentExpression(
              this.createMemberExpression(
                thisIdentifier,
                ctorIdentifier
              ),
              ctorIdentifier
            ),
            thisIdentifier
          ]),
          this.createCallExpression(
            this.createIdentifier(EXECUTOR_FUNC_NAME), [
              this.createCallExpression(
                this.createFunctionExpression(
                  this.createBlockStatement([
                    node.body.type === 'BlockStatement'
                      ? this.createTryStatement(
                          this.createBlockStatement([
                            returnCall
                          ]),
                          null,
                          this.createBlockStatement([
                            this.createExpressionStatement(
                              this.createCallExpression(
                                this.createIdentifier(SCOPE_TRACER_NAME),
                                [this.createLiteral(false)]
                              )
                            )
                          ])
                        )
                      : returnCall
                  ]), [], 'FunctionExpression', true, node.async
                )
              )
            ]
          )
        )
      )
    ]);
  }

  // 转换class
  transformClass(node, ancestors) {
    const ctorNode = node.body.find((m) => m.kind === 'constructor');
    if (ctorNode) {
      const ctorFuncExpr = ctorNode.value;
      const innerFuncExpr = ctorFuncExpr.body.body[1].declarations[0].init;
      innerFuncExpr.body.body.unshift(ctorFuncExpr.body.body[0]);
      innerFuncExpr.params = ctorFuncExpr.params;
      ctorNode.key.name = CLASS_CONSTRUCTOR_NAME;
      ctorNode.value = innerFuncExpr;
      ctorNode.kind = 'method';
    }
    const parentNode = ancestors[ancestors.length - 2];
    const ctorIdentifier = this.createIdentifier(CLASS_CONSTRUCTOR_NAME);
    const ctorArgs = [];
    const ctorBody = [];
    if (parentNode.superClass) {
      ctorArgs.push(this.createRestElement(this.createIdentifier('args')));
      ctorBody.push(this.createExpressionStatement(
        this.createCallExpression(
          this.createSuper(),
          [this.createSpreadElement(this.createIdentifier('args'))]
        )
      ));
    }
    ctorBody.push(this.createReturnStatement(
      this.createConditionalExpression(
        this.createUnaryExpression(
          this.createMemberExpression(
            this.createMetaProperty(this.createIdentifier('new'), this.createIdentifier('target')),
            ctorIdentifier
          ), '!'
        ),
        this.createThisExpression(),
        this.createCallExpression(
          this.createIdentifier(EXECUTOR_FUNC_NAME),
          [this.createCallExpression(
            this.createMemberExpression(
              this.createMemberExpression(this.createThisExpression(), ctorIdentifier),
              this.createIdentifier('call')
            ), [this.createThisExpression()]
          )]
        )
      )
    ));
    const ctorDefinition = this.createMethodDefinition(
      'constructor',
      this.createIdentifier('constructor'),
      this.createFunctionExpression(
        this.createBlockStatement(ctorBody),
        ctorArgs, 'FunctionExpression', false
      )
    );
    node.body.push(ctorDefinition);
  }

  // 转换new表达式
  transformNewExpression(node) {
    Object.assign(node, this.createYieldExpression(
      this.createCallExpression(
        this.createIdentifier(CLASS_CREATE_NAME),
        [node.callee, this.createArrayExpression(node.arguments)]
      ))
    );
  }

  // 转换import语句
  transformImportDeclaration(node) {
    const importExpression = this.createImportCallExpression(node.source);
    const yieldExpression = this.createYieldExpression(importExpression, false);
    if (node.specifiers?.length) {
      const importNsSpecifier = node.specifiers.find((specifier) => specifier.type === 'ImportNamespaceSpecifier');
      const varNsDeclarator = importNsSpecifier && this.createVariableDeclarator(importNsSpecifier.local, yieldExpression);
      const objPatternProperties = node.specifiers
        .filter((specifier) => specifier.type !== 'ImportNamespaceSpecifier')
        .map((specifier) => {
          return this.createProperty(specifier.imported || this.createIdentifier('default'), specifier.local);
        });
      const objPattern = this.createObjectPattern(objPatternProperties);
      const varDeclarator = this.createVariableDeclarator(objPattern, varNsDeclarator || yieldExpression);
      const varDeclaration = this.createVariableDeclaration('const', varNsDeclarator ? [varNsDeclarator, varDeclarator] : [varDeclarator]);
      Object.assign(node, varDeclaration);
    } else {
      Object.assign(node, this.createExpressionStatement(yieldExpression));
    }
  }

  // 转换动态import表达式
  transformImportExpression(node) {
    Object.assign(node, this.createImportCallExpression(node.source, true));
  }

  // 转换默认export声明
  transformExportDefaultDeclaration(node) {
    const exportIdentifier = this.createIdentifier(EXPORT_OBJECT_NAME);
    const declaration = node.declaration;
    switch (declaration.type) {
      case 'FunctionDeclaration':
      case 'ClassDeclaration':
      case 'VariableDeclaration': {
        if (declaration.id) {
          const exportAssignmentExpression = this.createExportAssginmentExpression(exportIdentifier, this.createIdentifier('default'), declaration.id);
          const exportExprStatment = this.createExpressionStatement(exportAssignmentExpression);
          this.exportDeclarationNodeList.push(exportExprStatment);
          Object.assign(node, declaration);
          break;
        }
      }
      default: {
        const exportAssignmentExpression = this.createExportAssginmentExpression(exportIdentifier, this.createIdentifier('default'), declaration);
        const exportExprStatment = this.createExpressionStatement(exportAssignmentExpression);
        Object.assign(node, exportExprStatment);
      }
    }
  }

  // 转换具名export声明
  transformExportNamedDeclaration(node) {
    const exportIdentifier = this.createIdentifier(EXPORT_OBJECT_NAME);
    if (node.specifiers?.length) {
      if (node.source) {
        const tmpImportExpression = this.createImportCallExpression(node.source);
        const tmpYieldExprression = this.createYieldExpression(tmpImportExpression, false);
        const tmpExportsIdentifier = this.createIdentifier(TMP_VARIABLE_NAME);
        const tmpExportsMemberExpr = this.createMemberExpression(exportIdentifier, tmpExportsIdentifier);
        const tmpExportsAssignmentExpr = [this.createExportAssginmentExpression(exportIdentifier, tmpExportsIdentifier, tmpYieldExprression)];
        const exportAssignmentExprs = node.specifiers.map((specifier) => {
          return this.createExportAssginmentExpression(exportIdentifier, specifier.exported, this.createMemberExpression(tmpExportsMemberExpr, specifier.local));
        });
        const exportSeqExpression = this.createSequenceExpression(tmpExportsAssignmentExpr.concat(exportAssignmentExprs));
        const exportExprStatment = this.createExpressionStatement(exportSeqExpression);
        Object.assign(node, exportExprStatment);                
      } else {
        const exportAssignmentExprs = node.specifiers.map((specifier) => {
          return this.createExportAssginmentExpression(exportIdentifier, specifier.exported, specifier.local);
        });
        const exportSeqExpression = this.createSequenceExpression(exportAssignmentExprs);
        const exportExprStatment = this.createExpressionStatement(exportSeqExpression);
        Object.assign(node, exportExprStatment);
      }
    } else if (node.declaration) {
      const declaration = node.declaration;
      switch (declaration.type) {
        case 'FunctionDeclaration':
        case 'ClassDeclaration': {
          const exportNameIdentifier = declaration.id;
          const exportAssignmentExpression = this.createExportAssginmentExpression(exportIdentifier, exportNameIdentifier, exportNameIdentifier);
          const exportExprStatment = this.createExpressionStatement(exportAssignmentExpression);
          this.exportDeclarationNodeList.push(exportExprStatment);
          Object.assign(node, declaration);
          break;
        }
        case 'VariableDeclaration': {
          const exportAssignmentExprs = declaration.declarations.map((varDeclarator) => {
            switch (varDeclarator.id.type) {
              case 'Identifier': return this.createExportAssginmentExpression(exportIdentifier, varDeclarator.id, varDeclarator.id);
              case 'ObjectPattern': {
                const properties = varDeclarator.id.properties;
                const tmpExportsIdentifier = this.createIdentifier(TMP_VARIABLE_NAME);
                const tmpExportsMemberExpr = this.createMemberExpression(exportIdentifier, tmpExportsIdentifier);
                const tmpExportsAssignmentExpr = [this.createExportAssginmentExpression(exportIdentifier, tmpExportsIdentifier, varDeclarator.id)];
                const exportsAssignmentExprs = properties.map((property) => {
                  return this.createExportAssginmentExpression(exportIdentifier, property.value, this.createMemberExpression(tmpExportsMemberExpr, property.key));
                });
                return tmpExportsAssignmentExpr.concat(exportsAssignmentExprs);
              }
              default: throw new SyntaxError('Unexpected token of named export');
            }
          });
          const exportSeqExpression = this.createSequenceExpression([].concat(...exportAssignmentExprs));
          const exportExprStatment = this.createExpressionStatement(exportSeqExpression);
          this.exportDeclarationNodeList.push(exportExprStatment);
          Object.assign(node, declaration);
          break;
        }
        default: throw new SyntaxError('Unexpected token of named export');
      }
    }
  }

  // 转换全导出export声明
  transformExportAllDeclaration(node) {
    // TODO: export * from 'a.js' / export * as k from 'a.js'
    throw new SyntaxError('Unexpected export all declaration');
  }

  // 转换import.meta
  transformMetaProperty(node) {
    if (node.meta?.name === 'import' && node.property?.name === 'meta') {
      const importMetaIdentifier = this.createIdentifier(IMPORT_META_NAME);
      Object.assign(node, importMetaIdentifier);
    } else if (node.meta?.name === 'new' && node.property?.name === 'target') {
      const newTargetIdentifier = this.createIdentifier(NEW_TARGET_NAME);
      Object.assign(node, newTargetIdentifier);
    }
  }

  // 处理全局信息，包括提升import语句到开头、在开头创建exports对象、在最好返回exports对象
  transformGlobalInfo(node) {
    if (this.importNodeList.length) {
      for (let i = 0; i < this.importNodeList.length; i++) {
        const importNode = this.importNodeList[i];
        const importIndex = node.body.indexOf(importNode);
        node.body.splice(importIndex, 1);
      }
      node.body = this.importNodeList.concat(node.body);
      node.body = [this.createModuleRequestStatement()].concat(node.body);
    }
    if (this.exportDeclarationNodeList.length) {
      node.body = node.body.concat(this.exportDeclarationNodeList);
    }
    const debuggerIdIdentifier = this.createIdentifier(DEBUGGER_ID_NAME);
    const importMetaIdentifier = this.createIdentifier(IMPORT_META_NAME);
    const exportObjIdentifier = this.createIdentifier(EXPORT_OBJECT_NAME);
    node.body.unshift(this.createVariableDeclaration('let', [
      this.createVariableDeclarator(debuggerIdIdentifier, this.createLiteral(this.debuggerId)),
      this.createVariableDeclarator(
        importMetaIdentifier,
        this.createObjectExpression([
          this.createProperty(
            this.createIdentifier('url'),
            debuggerIdIdentifier
          )
        ])
      ),
      this.createVariableDeclarator(exportObjIdentifier, this.createObjectExpression()),
      ...this.createScopeVariableDeclarators()
    ]));
    node.body.push(this.createReturnStatement(exportObjIdentifier));
  }

  // 创建字面量AST节点
  createLiteral(value) {
    return { type: 'Literal', value, raw: JSON.stringify(value) };
  }

  // 创建标识符AST节点
  createIdentifier(name) {
    return { type: 'Identifier', name };
  }

  // 创建块级语句AST节点
  createBlockStatement(body = []) {
    return { type: 'BlockStatement', body };
  }

  // 创建generator函数表达式AST节点
  createFunctionExpression(body, params = [], type = 'FunctionExpression', generator = true, async = false) {
    return { type, id: null, expression: body.type !== 'BlockStatement', generator, async, params, body };
  }

  // 创建this表达式AST节点
  createThisExpression() {
    return { type: 'ThisExpression' };
  }

  // 创建函数调用表达式AST节点
  createCallExpression(callee, args = []) {
    return { type: 'CallExpression', callee, arguments: args };
  }

  // 创建yield表达式AST节点
  createYieldExpression(argument, delegate = true) {
    return { type: 'YieldExpression', argument, delegate };
  }

  // 创建变量声明AST节点
  createVariableDeclaration(kind, declarations) {
    return { type: 'VariableDeclaration', kind, declarations };
  }

  // 创建变量声明项AST节点
  createVariableDeclarator(id, init) {
    return { type: 'VariableDeclarator', id, init };
  }

  // 创建对象解构AST节点
  createObjectPattern(properties) {
    return { type: 'ObjectPattern', properties };
  }

  // 创建对象属性AST节点
  createProperty(key, value) {
    return { type: 'Property', shorthand: false, computed: false, method: false, kind: 'init', key, value };
  }

  // 创建赋值表达式AST节点
  createAssignmentExpression(left, right) {
    return { type: 'AssignmentExpression', operator: '=', left, right };
  }

  // 创建对象成员AST节点
  createMemberExpression(object, property) {
    return { type: 'MemberExpression', computed: false, optional: false, object, property };
  }

  // 创建序列表达式AST节点
  createSequenceExpression(expressions) {
    return { type: 'SequenceExpression', expressions };
  }

  // 创建表达式语句AST节点
  createExpressionStatement(expression) {
    return { type: 'ExpressionStatement', expression };
  }

  // 创建对象表达式AST节点
  createObjectExpression(properties = []) {
    return { type: 'ObjectExpression', properties };
  }

  // 创建数组表达式AST节点
  createArrayExpression(elements = []) {
    return { type: 'ArrayExpression', elements };
  }

  // 创建返回语句AST节点
  createReturnStatement(argument) {
    return { type: 'ReturnStatement', argument };
  }

  // 创建三元表达式AST节点
  createConditionalExpression(test, consequent, alternate) {
    return { type: 'ConditionalExpression', test, consequent, alternate };
  }

  // 创建二元表达式AST节点
  createBinaryExpression(left, operator, right) {
    return { type: 'BinaryExpression', left, operator, right };
  }

  // 创建一元表达式AST节点
  createUnaryExpression(argument, operator, prefix = true) {
    return { type: 'UnaryExpression', argument, operator, prefix };
  }
  
  // 创建逻辑表达式AST节点
  createLogicalExpression(left, operator, right) {
    return { type: 'LogicalExpression', left, operator, right };
  }

  // 创建meta属性AST节点，如new.target
  createMetaProperty(meta, property) {
    return { type: 'MetaProperty', meta, property };
  }

  // 创建try catch语句AST节点
  createTryStatement(block, handler, finalizer) {
    return { type: 'TryStatement', block, handler, finalizer };
  }

  // 创建类方法定义AST节点
  createMethodDefinition(kind, key, value) {
    return { type: 'MethodDefinition', kind, key, value, static: false, computed: false };
  }

  // 创建super节点
  createSuper() {
    return { type: 'Super' };
  }

  // 创建剩余参数AST节点
  createRestElement(argument) {
    return { type: 'RestElement', argument };
  }

  // 创建展开参数AST节点
  createSpreadElement(argument) {
    return { type: 'SpreadElement', argument };
  }
}
