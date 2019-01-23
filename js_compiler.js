'use strict';

function logJsSourceAtCursor() {
  var node = getNodeUnderCursor();
  if (!node) return;
  var compiledStatements = compileStatements(node.getAttribute('data-id'));
  console.log(compiledStatements);
}

function logJsAtCursor() {
  var node = getNodeUnderCursor();
  if (!node) return;
  var compiledStatement = compileStatement(node.getAttribute('data-id'));
  var f = new Function('return ' + compiledStatement);
  var returnValue = f();
  console.log(returnValue);
}

function runJsAtCursor() {
  var node = getNodeUnderCursor();
  if (!node) return;
  var compiledStatements = compileStatements(node.getAttribute('data-id'));
  var f = new Function(compiledStatements);
  f();
}

const _nextStatement = 'a31cd1de77937a195c661c6e31411ed3'; builtinNameMatches.push({name: ';',        id: _nextStatement});
const _calls         = 'd7c64660b917a006d7ee44d9a63f4a30'; builtinNameMatches.push({name: 'calls',    id: _calls});
const _arg0          = '1a999c551bb257a060cf9ee12ee90c80'; builtinNameMatches.push({name: 'arg0',     id: _arg0});
const _arg1          = '428893f0ba55b8ae6b7d7b2eb048ce28'; builtinNameMatches.push({name: 'arg1',     id: _arg1});
const _return        = '927ad3ba8e18f78e2a40acf07b1cc216'; builtinNameMatches.push({name: 'return',   id: _return});
const _debugger      = '14f546625ba20b7a9f16eb2856e0df50'; builtinNameMatches.push({name: 'debugger', id: _debugger});
const _array         = '066fc9006935c654d92da7e37eb9c025'; builtinNameMatches.push({name: '[]',       id: _array});
const _object        = 'b7455d55447ba1d396bd793d4444c92b'; builtinNameMatches.push({name: '{}',       id: _object});
const _nextInArray   = 'c07443aac7845de6e528aabf8ac8b9d7'; builtinNameMatches.push({name: ',',        id: _nextInArray});
const _keyValue      = 'f14cf1dee906242cb05c851806d09403'; builtinNameMatches.push({name: ':',        id: _keyValue});
const _for           = 'f25ba8820a24770336a7db493a669698'; builtinNameMatches.push({name: 'for',      id: _for});
const _var           = 'c25841503f6300d1a1596d7857f15577'; builtinNameMatches.push({name: 'var',      id: _var});
const _varAssign     = 'c25841503f6300d1a1596d7857f15577'; builtinNameMatches.push({name: 'var=',     id: _varAssign});
const _assign        = 'f91505880c0d564484651c082ec8ac91'; builtinNameMatches.push({name: '=',        id: _assign});
const _of            = '5b4a607c62dd9796a9201f7667be2d31'; builtinNameMatches.push({name: 'of',       id: _of});
const _do            = 'ca9a572f8076df24642f743201a29f22'; builtinNameMatches.push({name: 'do',       id: _do});
const _true          = 'd86016a6b310e0854d0095541c568aac'; builtinNameMatches.push({name: 'true',     id: _true});
const _false         = 'b999ebbaf067ecf6265c163528074532'; builtinNameMatches.push({name: 'false',    id: _false});
const _null          = '462fa97a7761f3c0c82ef10043cebb81'; builtinNameMatches.push({name: 'null',     id: _null});
const _filter        = '2d92747b3bbad3635a0d1026fb5eed40'; builtinNameMatches.push({name: 'filter',   id: _filter});
const _is            = '68d2dc712a4250302bfc0d8276a6acb3'; builtinNameMatches.push({name: 'is',       id: _is});
const _plus          = 'da04eff3debce2fc6913d4f07d48c2d2'; builtinNameMatches.push({name: '+',        id: _plus});
const _multiply      = 'e1b13be452e682a8007b32230751bffe'; builtinNameMatches.push({name: '*',        id: _multiply});
const _arrowFunction = '306e41be644af73ffe32c023f2542157'; builtinNameMatches.push({name: '=>',       id: _arrowFunction});
const _if            = '7396a212aa6e8a028dd22af0e0ea5ffa'; builtinNameMatches.push({name: 'if',       id: _if});
const _then          = 'bc8acf9fc911546ca9ae3c596ceef430'; builtinNameMatches.push({name: 'then',     id: _then});
const _else          = '3c5f558043161cf19ebc2d84f04ab596'; builtinNameMatches.push({name: 'else',     id: _else});

function compileStatements(id) {
  return graph.followListNodes(id, _nextStatement).map(compileStatement).join(';');
}

function compileStatement(node) {
  var constants = {
    _true:     'true',
    _false:    'false',
    _null:     'null',
    _debugger: 'debugger',
  }
  if (node in constants) {
    return constants[node];
  }

  let statement = null;

  if (statement = compileFunctionCall(node))   return statement;
  if (statement = compileArray(node))          return statement;
  if (statement = compileObject(node))         return statement;
  if (statement = compileForLoop(node))        return statement;
  if (statement = compileFilter(node))         return statement;
  if (statement = compileAddition(node))       return statement;
  if (statement = compileMultiplication(node)) return statement;
  if (statement = compileArrowFunction(node))  return statement;
  if (statement = compileVarAssignment(node))  return statement;
  if (statement = compileIfStatement(node))    return statement;

  var return_ = graph.findNodeVia(node, _return);
  if (return_) {
    return 'return ' + compileStatement(return_);
  }

  var arrowFunction = graph.findNodeVia(node, '=>');
  if (arrowFunction) {
    var args = [];
    var argIndex = 0;
    do {
      var arg = graph.findNodeVia(node, 'arg' + argIndex);
      if (arg) {
        args.push(arg.value);
      }
      argIndex++;
    } while (arg)
    return '(' + args.join(',') + ') => {' + compileStatements(arrowFunction) + '}';
  }

  var varLink = graph.findLinkVia(node, 'var');
  if (varLink) {
    var equalsLink = graph.findLinkVia(node, '=');
    if (equalsLink) {
      return 'var ' + varLink.to.value + ' = ' + compileStatement(equalsLink.to);
    }
  }

  var equals = graph.findNodeVia(node, '=');
  if (equals) {
    var left = node;
    var leftIs = graph.findNodeVia(node, 'is');
    if (leftIs) {
      left = leftIs;
    }
    var right = equals;
    var rightIs = graph.findNodeVia(equals, 'is');
    if (rightIs) {
      right = rightIs;
    }
    return compileStatement(left) + ' = ' + compileStatement(right);
  }

  if (graph.findLinkVia(node, '.')) {
    return followListNodes(node, '.').map(currentNode => {
      var is = graph.findNodeVia(currentNode, 'is');
      return is ? compileStatement(is) : currentNode.value;
    }).join('.');
  }

  var is = graph.findNodeVia(node, _is);
  if (is) {
    return compileStatement(is);
  }

  return graph.getNameForId(node);
}

function compileFunctionCall(node) {
  var calls = graph.findNodeVia(node, _calls);
  if (calls === null) return null;
  var callsStatement = compileStatement(calls);
  var arg0 = graph.findNodeVia(node, _arg0);
  if (arg0) {
    var arg1 = graph.findNodeVia(node, _arg1);
    if (arg1) {
      return callsStatement + '(' + compileStatement(arg0) + ',' + compileStatement(arg1) + ')';
    } else {
      return callsStatement + '(' + compileStatement(arg0) + ')';
    }
  } else {
    return callsStatement + '()';
  }
}

function compileForLoop(node) {
  var for_ = graph.findNodeVia(node, _for);
  var of_ = graph.findNodeVia(node, _of);
  var do_ = graph.findNodeVia(node, _do);
  if (for_ && of_ && do_) {
    return 'for (var ' + graph.getNameForId(for_) + ' of ' + compileStatement(of_) + ') {' + compileStatements(do_) + '}';
  } else {
    return null;
  }
}

function compileArray(node) {
  var firstElement = graph.findNodeVia(node, _array);
  if (!firstElement) return null;
  return '[' + graph.followListNodes(firstElement, _nextInArray).map(a => compileStatement(a)).join(',') + ']';
}

function compileObject(node) {
  var firstKey = graph.findNodeVia(node, _object);
  if (!firstKey) return null;
  return '{' + graph.followListNodes(firstKey, _nextInArray).map(keyNode => {
    var value = graph.findNodeVia(keyNode, _keyValue);
    if (value) {
      return "'" + graph.getNameForId(keyNode) + "':" + compileStatement(value);
    } else {
      return "'" + graph.getNameForId(keyNode) + "':undefined";
    }
  }).join(',') + '}';
}

function compileFilter(node) {
  var filterCallback = graph.findNodeVia(node, _filter);
  if (!filterCallback) return null;
  var is = graph.findNodeVia(node, _is);
  if (is) {
    is = compileStatement(is);
  } else {
    is = graph.getNameForId(node);
  }
  return is + '.filter(()=>{' + compileStatement(filterCallback) + '})';
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
  return 'var ' + graph.getNameForId(node) + ' = ' + compileStatement(varAssignTo);
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

function makeJsonGraph(json, position) {
  var firstKeyNode = null;
  var previousKeyNode = null;
  for (var key in json) {
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
