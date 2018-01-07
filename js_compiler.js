function isJs(node) {
  return Array.from(node.links).find(link => link.from === node && link.via.value in {'calls': true, 'eval': true}) !== null;
}

function compileStatements(node) {
  return followListNodes(node, ';').map(compileStatement).join(';');
}

function compileStatement(node) {
  if (findLinkVia(node, 'calls')) {
    return compileFunctionCall(node);
  }

  if (findLinkVia(node, ':')) {
    return compileJson(node);
  }

  var if_ = findNodeVia(node, 'if');
  var then = findNodeVia(node, 'then');
  if (if_ && then) {
    return "if(" + compileStatement(if_) + "){" + compileStatements(then) + "}";
  }

  if (findLinkVia(node, 'for')) {
    return compileForLoop(node);
  }

  var varLink = findLinkVia(node, 'var');
  if (varLink) {
    var equalsLink = findLinkVia(node, '=');
    if (equalsLink) {
      return 'var ' + varLink.to.value + ' = ' + compileStatement(equalsLink.to);
    }
  }

  var lvalue = findNodeVia(node, 'lvalue');
  var equals = findNodeVia(node, '=');
  if (lvalue && equals) {
    return compileStatement(lvalue) + ' = ' + compileStatement(equals);
  }

  var awaitTo = findNodeVia(node, 'await');
  if (awaitTo) {
    return 'await ' + compileStatement(awaitTo);
  }

  var asyncFunctionName = findNodeVia(node, 'declare async function');
  var asyncFunctionBody = findNodeVia(node, 'body');
  if (asyncFunctionName && asyncFunctionBody) {
    return 'async function ' + asyncFunctionName.value + '() {' + compileStatements(asyncFunctionBody) + '}';
  }

  if (findLinkVia(node, '.')) {
    return followListNodes(node, '.').map(currentNode => {
      var is = findNodeVia(currentNode, 'is');
      return is ? compileStatement(is) : currentNode.value;
    }).join('.');
  }

  var is = findNodeVia(node, 'is');
  if (is) {
    return compileStatement(is);
  }

  return node.value;
}

function compileFunctionCall(node) {
  var calls = compileStatement(findNodeVia(node, 'calls'));
  var arg0 = findNodeVia(node, 'arg0');
  if (arg0) {
    var arg1 = findNodeVia(node, 'arg1');
    if (arg1) {
      return calls + '(' + compileStatement(arg0) + ',' + compileStatement(arg1) + ')';
    } else {
      return calls + '(' + compileStatement(arg0) + ')';
    }
  } else {
    return calls + '()';
  }
}

function compileForLoop(node) {
  var for_ = findNodeVia(node, 'for');
  var of_ = findNodeVia(node, 'of');
  var do_ = findNodeVia(node, 'do');
  if (for_ && of_ && do_) {
    return 'for (var ' + for_.value + ' of ' + compileStatement(of_) + ') {' + compileStatements(do_) + '}';
  }
}

function compileJson(node) {
  if (!findLinkVia(node, ',') && !findLinkVia(node, ':')) {
    return node.value;
  }
  return '{' + followListNodes(node, ',').map(keyNode => {
    var value = findNodeVia(keyNode, ':');
    if (value) {
      return "'" + keyNode.value + "':" + compileJson(value);
    } else {
      return "'" + keyNode.value + "':undefined";
    }
  }).join(',') + '}';
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
