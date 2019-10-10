'use strict';

const htmlSymbols = [];

const _tag         = '1a3fe9c8299bb96525cf2d508429ebf8'; htmlSymbols.push({name: '</>',     id: _tag});
const _child       = '1202fd0fa30565a42d9ffe2549725c59'; htmlSymbols.push({name: '->',      id: _child});
const _sibling     = '1d6655ba2ca8030affc72b05af4c2926'; htmlSymbols.push({name: '|',       id: _sibling});
const _textContent = '4864556309ad38df157c2a2384a127b1'; htmlSymbols.push({name: '""',      id: _textContent});
const _div         = 'd11b50d14f62e851911361fcb5f1c190'; htmlSymbols.push({name: 'div',     id: _div});
const _span        = '98f57dc515e1e606e2559b9a4f4620e0'; htmlSymbols.push({name: 'span',    id: _span});
const _p           = '20701f3935a047ae8580ea3cbfd7f2d4'; htmlSymbols.push({name: 'p',       id: _p});
const _h1          = 'ac9170351582e7ad92695b9c7b608b4d'; htmlSymbols.push({name: 'h1',      id: _h1});
const _script      = '144d24c36274780d9c872d59f675a162'; htmlSymbols.push({name: 'script',  id: _script});
const _style       = '3049868f3e58a4e7046fd4f1234e17f4'; htmlSymbols.push({name: 'style',   id: _style});
const _button      = '0402df62de7d3950f811d38036bee89e'; htmlSymbols.push({name: 'button',  id: _button});
const _id          = '573465db3ae28ac8e42d716faa44ff4a'; htmlSymbols.push({name: 'id',      id: _id});
const _class       = '6c8d5c7756858aa43f136630c279dbe4'; htmlSymbols.push({name: 'class',   id: _class});

for (const symbol of htmlSymbols) {
  builtinNameMatches.push(symbol);
}
const htmlSyntaxHighlighting = new CSSStyleSheet();
htmlSyntaxHighlighting.replaceSync(htmlSymbols.map(symbol => `[data-id="${symbol.id}"]`).join(',') + ' {color: #dc4d25; font-weight: bold}');
document.adoptedStyleSheets = [...document.adoptedStyleSheets, htmlSyntaxHighlighting];

var launchedHtmlWindow = null;

function transpileHtmlAtCursor() {
  const nodeAtCursor = getNodeAtCursor();
  if (nodeAtCursor) {
    console.log(transpileHtml(nodeAtCursor.dataset.id));
  }
}

function launchHtmlAtCursor() {
  const nodeAtCursor = getNodeAtCursor();
  if (nodeAtCursor) {
    const html = transpileHtml(nodeAtCursor.dataset.id);
    if (!launchedHtmlWindow || launchedHtmlWindow.window === null) {
      launchedHtmlWindow = window.open();
    }
    launchedHtmlWindow.document.open();
    launchedHtmlWindow.document.write(html);
    launchedHtmlWindow.document.close();
  }
}

const htmlPanel = document.querySelector('.panel[data-panel="html"]');

document.addEventListener('cursorPositionEvaluated', event => {
  const panelContainer = javascriptPanel.closest('.panels-container');
  if (currentSurface === mainSurface && panelContainer.classList.contains('expanded') && panelContainer.dataset.panel === 'html') {
    const nodeAtCursor = getNodeAtCursor();
    const htmlSourceElement = htmlPanel.getElementsByClassName('source')[0];
    if (nodeAtCursor) {
      const html = transpileHtml(nodeAtCursor.dataset.id);
      htmlSourceElement.textContent = html;
      hljs.highlightBlock(htmlSourceElement);
    } else {
      htmlSourceElement.textContent = '';
    }
  }
});

document.getElementById('launch_html_button').addEventListener('click', event => {
  launchHtmlAtCursor();
});

function addIndentation(string) {
  return string.split('\n').map(line => '  ' + line).join('\n');
}

function transpileHtml(node) {
  return graph.followListNodes(node, _sibling).map(transpileElement).join('\n');
}

function transpileElement(node) {
  let tagName = null;
  const attributes = new Map();
  let textContent = null;

  const tag = graph.findNodeVia(node, _tag);
  if (tag) {
    tagName = graph.getNameForId(tag);
  }

  const div = graph.findNodeVia(node, _div);
  if (div) {
    tagName = 'div';
    textContent = graph.getNameForId(div);
  }

  const span = graph.findNodeVia(node, _span);
  if (span) {
    tagName = 'span';
    textContent = graph.getNameForId(span);
  }

  const p = graph.findNodeVia(node, _p);
  if (p) {
    tagName = 'p';
    textContent = graph.getNameForId(p);
  }

  const h1 = graph.findNodeVia(node, _h1);
  if (h1) {
    tagName = 'h1';
    textContent = graph.getNameForId(h1);
  }

  const script = graph.findNodeVia(node, _script);
  if (script) {
    tagName = 'script';
    textContent = compileStatements(script);
  }

  const style = graph.findNodeVia(node, _style);
  if (style) {
    tagName = 'style';
    textContent = transpileCss(style);
  }

  const button = graph.findNodeVia(node, _button);
  if (button) {
    tagName = 'button';
    textContent = graph.getNameForId(button);
  }

  if (textContent === null) {
    textContent = graph.findNodeVia(node, _textContent);
    textContent = textContent ? graph.getNameForId(textContent) : '';
  }

  const firstChild = graph.findNodeVia(node, _child);
  const content = firstChild ? transpileHtml(firstChild) : '';

  const id = graph.findNodeVia(node, _id);
  if (id) {
    attributes.set('id', graph.getNameForId(id));
  }

  const class_ = graph.findNodeVia(node, _class);
  if (class_) {
    attributes.set('class', graph.getNameForId(class_));
  }

  let attributesText = '';
  if (attributes.size > 0) {
    attributesText = ' ' + [...attributes.entries()].map(i => `${i[0]}="${i[1]}"`).join(' ');
  }

  if (textContent && content) {
    return `<${tagName}${attributesText}>\n${addIndentation(textContent)}\n${addIndentation(content)}\n</${tagName}>`;
  } else if (textContent) {
    if (textContent.includes('\n')) {
      return `<${tagName}${attributesText}>\n${addIndentation(textContent)}\n</${tagName}>`;
    } else {
      return `<${tagName}${attributesText}>${textContent}</${tagName}>`;
    }
  } else if (content) {
    return `<${tagName}${attributesText}>\n${addIndentation(content)}\n</${tagName}>`;
  } else {
    return `<${tagName}${attributesText}></${tagName}>`;
  }
}
