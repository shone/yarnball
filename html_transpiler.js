'use strict';

const _tag         = '1a3fe9c8299bb96525cf2d508429ebf8'; builtinNameMatches.push({name: '</>',     id: _tag});
const _child       = '1202fd0fa30565a42d9ffe2549725c59'; builtinNameMatches.push({name: '->',      id: _child});
const _sibling     = '1d6655ba2ca8030affc72b05af4c2926'; builtinNameMatches.push({name: '|',       id: _sibling});
const _textContent = '4864556309ad38df157c2a2384a127b1'; builtinNameMatches.push({name: '""',      id: _textContent});
const _div         = 'd11b50d14f62e851911361fcb5f1c190'; builtinNameMatches.push({name: 'div',     id: _div});
const _span        = '98f57dc515e1e606e2559b9a4f4620e0'; builtinNameMatches.push({name: 'span',    id: _span});
const _script      = '144d24c36274780d9c872d59f675a162'; builtinNameMatches.push({name: 'script',  id: _script});
const _style       = '3049868f3e58a4e7046fd4f1234e17f4'; builtinNameMatches.push({name: 'style',   id: _style});
const _button      = '0402df62de7d3950f811d38036bee89e'; builtinNameMatches.push({name: 'button',  id: _button});
const _id          = '573465db3ae28ac8e42d716faa44ff4a'; builtinNameMatches.push({name: 'id',      id: _id});


var launchedHtmlWindow = null;

function transpileHtmlAtCursor() {
  var nodeAtCursor = getNodeAtCursor();
  if (nodeAtCursor) {
    console.log(transpileHtml(nodeAtCursor.dataset.id));
  }
}

function launchHtmlAtCursor(node) {
  var nodeAtCursor = getNodeAtCursor();
  if (nodeAtCursor) {
    var html = transpileHtml(nodeAtCursor.dataset.id);
    if (!launchedHtmlWindow || launchedHtmlWindow.window === null) {
      launchedHtmlWindow = window.open();
    }
    launchedHtmlWindow.document.open();
    launchedHtmlWindow.document.write(html);
    launchedHtmlWindow.document.close();
  }
}

function transpileHtml(node) {
  return graph.followListNodes(node, _sibling).map(transpileElement).join('');
}

function transpileElement(node) {
  var tagName = null;
  var attributes = new Map();
  var textContent = null;

  var tag = graph.findNodeVia(node, _tag);
  if (tag) {
    tagName = graph.getNameForId(tag);
  }

  var div = graph.findNodeVia(node, _div);
  if (div) {
    tagName = 'div';
    textContent = graph.getNameForId(div);
  }

  var span = graph.findNodeVia(node, _span);
  if (span) {
    tagName = 'span';
    textContent = graph.getNameForId(span);
  }

  var script = graph.findNodeVia(node, _script);
  if (script) {
    tagName = 'script';
    textContent = compileStatements(script);
  }

  var style = graph.findNodeVia(node, _style);
  if (style) {
    tagName = 'style';
    textContent = transpileCss(style);
  }

  var button = graph.findNodeVia(node, _button);
  if (button) {
    tagName = 'button';
    textContent = graph.getNameForId(button);
  }

  if (textContent === null) {
    textContent = graph.findNodeVia(node, _textContent);
    textContent = textContent ? graph.getNameForId(textContent) : '';
  }

  var firstChild = graph.findNodeVia(node, _child);
  var content = firstChild ? transpileHtml(firstChild) : '';

  var id = graph.findNodeVia(node, _id);
  if (id) {
    attributes.set('id', graph.getNameForId(id));
  } else {
    attributes.set('id', node);
  }

  var attributesText = '';
  if (attributes.size > 0) {
    attributesText = ' ' + [...attributes.entries()].map(i => `${i[0]}="${i[1]}"`).join(' ');
  }

  return `<${tagName}${attributesText}>${textContent}${content}</${tagName}>`;
}
