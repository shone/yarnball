'use strict';

function logJsSourceAtCursor() {
  var node = getNodeAtCursor();
  if (!node) return;
  var compiledStatements = compileStatements(node.dataset.id);
  console.log(compiledStatements);
}

function logJsAtCursor() {
  var node = getNodeAtCursor();
  if (!node) return;
  var compiledStatement = compileStatement(node.dataset.id);
  var f = new Function('return ' + compiledStatement);
  var returnValue = f();
  console.log(returnValue);
}

function runJsAtCursor() {
  var node = getNodeAtCursor();
  if (!node) return;
  var compiledStatements = compileStatements(node.dataset.id);
  var f = new Function(compiledStatements);
  f();
}

const _nextStatement  = 'a31cd1de77937a195c661c6e31411ed3'; builtinNameMatches.push({name: ';',        id: _nextStatement});
const _calls          = 'd7c64660b917a006d7ee44d9a63f4a30'; builtinNameMatches.push({name: 'calls',    id: _calls});
const _arg0           = '1a999c551bb257a060cf9ee12ee90c80'; builtinNameMatches.push({name: 'arg0',     id: _arg0});
const _arg1           = '428893f0ba55b8ae6b7d7b2eb048ce28'; builtinNameMatches.push({name: 'arg1',     id: _arg1});
const _return         = '927ad3ba8e18f78e2a40acf07b1cc216'; builtinNameMatches.push({name: 'return',   id: _return});
const _debugger       = '14f546625ba20b7a9f16eb2856e0df50'; builtinNameMatches.push({name: 'debugger', id: _debugger});
const _array          = '066fc9006935c654d92da7e37eb9c025'; builtinNameMatches.push({name: '[]',       id: _array});
const _object         = 'b7455d55447ba1d396bd793d4444c92b'; builtinNameMatches.push({name: '{}',       id: _object});
const _nextInArray    = 'c07443aac7845de6e528aabf8ac8b9d7'; builtinNameMatches.push({name: ',',        id: _nextInArray});
const _keyValue       = 'f14cf1dee906242cb05c851806d09403'; builtinNameMatches.push({name: ':',        id: _keyValue});
const _for            = 'f25ba8820a24770336a7db493a669698'; builtinNameMatches.push({name: 'for',      id: _for});
const _forof          = '6ab17eed66f42d3c61b0fc6332b9fae4'; builtinNameMatches.push({name: 'forof',    id: _forof});
const _var            = 'c25841503f6300d1a1596d7857f15577'; builtinNameMatches.push({name: 'var',      id: _var});
const _varAssign      = '9876d4cc0671d98029499a89eeee403e'; builtinNameMatches.push({name: 'var=',     id: _varAssign});
const _varAssignArray = '587daf98eb42f8c35c175ebcc25bfd48'; builtinNameMatches.push({name: 'var=[]',  id: _varAssignArray});
const _assign         = 'f91505880c0d564484651c082ec8ac91'; builtinNameMatches.push({name: '=',        id: _assign});
const _of             = '5b4a607c62dd9796a9201f7667be2d31'; builtinNameMatches.push({name: 'of',       id: _of});
const _do             = 'ca9a572f8076df24642f743201a29f22'; builtinNameMatches.push({name: 'do',       id: _do});
const _true           = 'd86016a6b310e0854d0095541c568aac'; builtinNameMatches.push({name: 'true',     id: _true});
const _false          = 'b999ebbaf067ecf6265c163528074532'; builtinNameMatches.push({name: 'false',    id: _false});
const _null           = '462fa97a7761f3c0c82ef10043cebb81'; builtinNameMatches.push({name: 'null',     id: _null});
const _is             = '68d2dc712a4250302bfc0d8276a6acb3'; builtinNameMatches.push({name: 'is',       id: _is});
const _plus           = 'da04eff3debce2fc6913d4f07d48c2d2'; builtinNameMatches.push({name: '+',        id: _plus});
const _increment      = '195b789126391dacd626e006c2eef205'; builtinNameMatches.push({name: '++',       id: _increment});
const _decrement      = 'a29e8926b29df8128c09a47b22ddfb50'; builtinNameMatches.push({name: '--',       id: _decrement});
const _multiply       = 'e1b13be452e682a8007b32230751bffe'; builtinNameMatches.push({name: '*',        id: _multiply});
const _arrowFunction  = '306e41be644af73ffe32c023f2542157'; builtinNameMatches.push({name: '=>',       id: _arrowFunction});
const _if             = '7396a212aa6e8a028dd22af0e0ea5ffa'; builtinNameMatches.push({name: 'if',       id: _if});
const _then           = 'bc8acf9fc911546ca9ae3c596ceef430'; builtinNameMatches.push({name: 'then',     id: _then});
const _else           = '3c5f558043161cf19ebc2d84f04ab596'; builtinNameMatches.push({name: 'else',     id: _else});
const _func           = '9b898d4d67176583125bc9b2b171264b'; builtinNameMatches.push({name: 'func',     id: _func});
const _objectLookup   = 'dd5388bc649d2adebd3e75173882b44b'; builtinNameMatches.push({name: '.',        id: _objectLookup});
const _lessThan       = '497151bb0675c63c6bd8af6b281bbcc6'; builtinNameMatches.push({name: '<',        id: _lessThan});
const _arrayLookup    = 'b62908d39501120190b5f705fd2c4215'; builtinNameMatches.push({name: 'x[]',      id: _arrayLookup});
const _equality       = '3cd7aecd2c529aa89b616ef24eb59fe3'; builtinNameMatches.push({name: '===',      id: _equality});

const _yarnballNode   = '7d81b8d30a96a491c939a8d0d4dd7bdb'; builtinNameMatches.push({name: 'node',     id: _yarnballNode});
const _yarnballGetName = '114dd6a9f611a288c8d360f7f9ba3d3e'; builtinNameMatches.push({name: 'name?',   id: _yarnballGetName});
const _yarnballSetName = '5f56351aba5c581fb5ca329049ac4b0a'; builtinNameMatches.push({name: 'name',    id: _yarnballSetName});
const _yarnballClick  = 'd91e6d8da5d91ce3b0a45594cbf5711e'; builtinNameMatches.push({name: 'click',    id: _yarnballClick});

function compileStatements(id) {
  return graph.followListNodes(id, _nextStatement).map(compileStatement).join(';');
}

function compileStatement(node) {

  let statement = null;

  if (statement = compileAssignment(node))         return statement;
  if (statement = compileForLoop(node))            return statement;
  if (statement = compileForofLoop(node))          return statement;
  if (statement = compileVarAssignment(node))      return statement;
  if (statement = compileVarArrayAssignment(node)) return statement;
  if (statement = compileIfStatement(node))        return statement;
  if (statement = compileIncrement(node))          return statement;
  if (statement = compileDecrement(node))          return statement;

  var return_ = graph.findNodeVia(node, _return);
  if (return_) {
    return 'return ' + compileStatement(return_);
  }

  return compileExpression(node);
}

function compileExpression(node) {
  var constants = {
    _true:     'true',
    _false:    'false',
    _null:     'null',
    _debugger: 'debugger',
  }
  if (node in constants) {
    return constants[node];
  }

  let expression = null;

  if (expression = compileArrayLookup(node))        return expression;
  if (expression = compileObjectLookup(node))       return expression;
  if (expression = compileFunctionCall(node))       return expression;
  if (expression = compileArray(node))              return expression;
  if (expression = compileObject(node))             return expression;
  if (expression = compileAddition(node))           return expression;
  if (expression = compileMultiplication(node))     return expression;
  if (expression = compileLessThan(node))           return expression;
  if (expression = compileEqualityTest(node))       return expression;
  if (expression = compileFunction(node))           return expression;
  if (expression = compileArrowFunction(node))      return expression;

  if (expression = compileYarnballNode(node))       return expression;
  if (expression = compileYarnballGetName(node))    return expression;
  if (expression = compileYarnballSetName(node))    return expression;

  var is = graph.findNodeVia(node, _is);
  if (is) {
    return graph.getNameForId(is);
  }

  return graph.getNameForId(node);
}

function compileObjectLookup(node) {
  var objectLookup = graph.findNodeVia(node, _objectLookup);
  if (!objectLookup) {
    return null;
  }
  var is = graph.getNameForId(graph.findNodeVia(node, _is) || node);
  return is + '.' + compileExpression(objectLookup);
}

function compileFunctionCall(node) {
  var calls = graph.findNodeVia(node, _calls);
  if (calls === null) return null;
  var callsStatement = compileExpression(calls);
  var arg0 = graph.findNodeVia(node, _arg0);
  if (arg0) {
    var arg1 = graph.findNodeVia(node, _arg1);
    if (arg1) {
      return callsStatement + '(' + compileExpression(arg0) + ',' + compileExpression(arg1) + ')';
    } else {
      return callsStatement + '(' + compileExpression(arg0) + ')';
    }
  } else {
    return callsStatement + '()';
  }
}

function compileAssignment(node) {
  var lvalue = node;
  var rvalue = graph.findNodeVia(node, _assign);
  if (!rvalue) {
    return null;
  }
  return `${compileExpression(lvalue)} = ${compileExpression(rvalue)}`;
}

function compileForLoop(node) {
  var for_ = graph.findNodeVia(node, _for);
  var of_ = graph.findNodeVia(node, _of);
  var do_ = graph.findNodeVia(node, _do);
  if (for_ && of_ && do_) {
    return 'for (let ' + graph.getNameForId(for_) + ' of ' + compileExpression(of_) + ') {' + compileStatements(do_) + '}';
  } else {
    return null;
  }
}

function compileForofLoop(node) {
  var forof_ = graph.findNodeVia(node, _forof);
  var do_ = graph.findNodeVia(node, _do);
  if (forof_ && do_) {
    return 'for (let ' + graph.getNameForId(node) + ' of ' + compileExpression(forof_) + ') {' + compileStatements(do_) + '}';
  } else {
    return null;
  }
}

function compileArray(node) {
  var firstElement = graph.findNodeVia(node, _array);
  if (!firstElement) return null;
  return '[' + graph.followListNodes(firstElement, _nextInArray).map(a => compileExpression(a)).join(',') + ']';
}

function compileObject(node) {
  var firstKey = graph.findNodeVia(node, _object);
  if (!firstKey) return null;
  return '{' + graph.followListNodes(firstKey, _nextInArray).map(keyNode => {
    var value = graph.findNodeVia(keyNode, _keyValue);
    if (value) {
      return `${graph.getNameForId(keyNode)}: ${compileExpression(value)}`;
    } else {
      return `${graph.getNameForId(keyNode)}: undefined`;
    }
  }).join(',') + '}';
}

function compileAddition(node) {
  var operands = graph.findNodesVia(node, _plus);
  if (operands.length === 0) return null;
  return operands.map(operand => '(' + compileStatement(operand) + ')').join('+');
}

function compileMultiplication(node) {
  var operands = graph.findNodesVia(node, _multiply);
  if (operands.length === 0) return null;
  return operands.map(operand => '(' + compileStatement(operand) + ')').join('*');
}

function compileArrowFunction(node) {
  var body = graph.findNodeVia(node, _arrowFunction);
  if (!body) return null;
  var arg0 = graph.findNodeVia(node, _arg0);
  if (arg0) {
    return '(' + graph.getNameForId(arg0) + ')=>{' + compileStatements(body) + '}';
  } else {
    return '()=>{' + compileStatements(body) + '}';
  }
}

function compileVarAssignment(node) {
  var varAssignTo = graph.findNodeVia(node, _varAssign);
  if (!varAssignTo) return null;
  return 'var ' + graph.getNameForId(node) + ' = ' + compileExpression(varAssignTo);
}

function compileVarArrayAssignment(node) {
  var varAssignTo = graph.findNodeVia(node, _varAssignArray);
  if (!varAssignTo) return null;
  return 'var ' + graph.getNameForId(node) + ' = [' + graph.followListNodes(varAssignTo, _nextInArray).map(a => compileStatement(a)).join(',') + ']';
}

function compileIfStatement(node) {
  var if_ = graph.findNodeVia(node, _if);
  var then = graph.findNodeVia(node, _then);
  if (if_ && then) {
    var block = "if(" + compileStatement(if_) + "){" + compileStatements(then) + "}";
    var else_ = graph.findNodeVia(node, _else);
    if (else_) {
      block += 'else{' + compileStatements(else_) + '}';
    }
    return block;
  } else {
    return null;
  }
}

function compileIncrement(node) {
  var increment = graph.findNodeVia(node, _increment);
  if (increment) {
    return graph.getNameForId(increment) + '++';
  } else {
    return null;
  }
}
function compileDecrement(node) {
  var decrement = graph.findNodeVia(node, _decrement);
  if (decrement) {
    return graph.getNameForId(decrement) + '--';
  } else {
    return null;
  }
}

function compileFunction(node) {
  var body = graph.findNodeVia(node, _func);
  if (!body) return null;
  var args = '';
  var arg0 = graph.findNodeVia(node, _arg0);
  if (arg0) {
    args = graph.getNameForId(arg0);
    var arg1 = graph.findNodeVia(node, _arg1);
    if (arg1) {
      args += ', ' + graph.getNameForId(arg1);
    }
  }
  return `function ${graph.getNameForId(node)}(${args}){${compileStatements(body)};}`;
}

function compileLessThan(node) {
  var rhs = graph.findNodeVia(node, _lessThan);
  if (!rhs) {
    return null;
  }
  var lhs = graph.getNameForId(graph.findNodeVia(node, _is) || node);
  rhs = compileStatement(rhs);
  return `(${lhs})<(${rhs})`;
}

function compileEqualityTest(node) {
  var operands = graph.findNodesVia(node, _equality);
  if (operands.length !== 2) return null;
  return `(${compileExpression(operands[0])})===(${compileExpression(operands[1])})`;
}

function compileArrayLookup(node) {
  var lookup = graph.findNodeVia(node, _arrayLookup);
  if (!lookup) {
    return null;
  }
  var is = graph.findNodeVia(node, _is) || node;
  return `${compileExpression(is)}[${compileExpression(lookup)}]`;
}

function compileYarnballNode(node) {
  var node = graph.findNodeVia(node, _yarnballNode);
  if (!node) {
    return null;
  }
  return `'${node}'`;
}

function compileYarnballGetName(node) {
  var name = graph.findNodeVia(node, _yarnballGetName);
  if (!name) {
    return null;
  }
  return `graph.getNameForId('${name}')`;
}

function compileYarnballSetName(node) {
  var name = graph.findNodeVia(node, _yarnballSetName);
  if (!name) {
    return null;
  }
  var is = graph.findNodeVia(node, _is) || node;
  return `setNodeName(document.querySelectorAll('[data-id="${is}"]')[0], ${compileStatement(name)})`;
}

mainSurface.addEventListener('mousedown', event => {
  if (event.target.classList.contains('node')) {
    var click = graph.findNodeVia(event.target.dataset.id, _yarnballClick);
    if (click) {
      var jsSource = compileStatements(click);
      var f = new Function(jsSource);
      f();
    }
  }
});

function makeJsonGraph(json, position) {
  var firstKeyNode = null;
  var previousKeyNode = null;
  for (let key in json) {
    var keyNode = null;
    if (typeof json[key] === 'object') {
      keyNode = createNode(position, key);
      var valueViaNode = createNode({x: position.x + 150, y: position.y}, ':');
      valueViaNode.classList.add('selected');
      position.x += 300;
      var valueNode = makeJsonGraph(json[key], position);
      if (!valueNode) {
        valueNode = createNode({x: position.x, y: position.y}, json[key]);
      }
      valueNode.classList.add('selected');
      position.x -= 300;
      var valueLink = createLink({from: keyNode, via: valueViaNode, to: valueNode});
      layoutLink(valueLink);
    } else {
      keyNode = createNode(position, key);
      var valueViaNode = createNode({x: position.x + 150, y: position.y}, ':');
      var valueText = json[key];
      if (typeof json[key] === 'string') {
        valueText = "'" + json[key] + "'";
      }
      var valueNode = createNode({x: position.x + 300, y: position.y}, valueText);
      var valueLink = createLink({from: keyNode, via: valueViaNode, to: valueNode});
      valueViaNode.classList.add('selected');
      valueNode.classList.add('selected');
      layoutLink(valueLink);
      position.y += 170;
    }
    keyNode.classList.add('selected');
    if (keyNode && previousKeyNode) {
      var nextKeyViaNode = createNode({x: position.x - 100, y: parseFloat(previousKeyNode.style.top) + 85}, ',');
      nextKeyViaNode.classList.add('selected');
      var nextKeyLink = createLink({from: previousKeyNode, via: nextKeyViaNode, to: keyNode});
      layoutLink(nextKeyLink);
    }
    if (!firstKeyNode) firstKeyNode = keyNode;
    previousKeyNode = keyNode;
  }
  return firstKeyNode;
}
