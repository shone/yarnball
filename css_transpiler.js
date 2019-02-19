'use strict';

const _rules   = '348b6fa30fc94e55378565889927dc7e'; builtinNameMatches.push({name: 'rules',   id: _rules});
const _body    = '9adf38d5f8209523ab285d0343097f8f'; builtinNameMatches.push({name: 'body',    id: _body});

const selectors = new Map([
  ['id',    '79a0b037275b58db64688c341db0e45f'],
  ['class', '17fb4cef59e502e243803bb54706b29b'],
  ['tag',   '55b040349bd16be47eb934032fd494fa'],
]);
for (let [name, id] of selectors) {
  builtinNameMatches.push({name: name, id: id});
}

const properties = new Map([
  ['display',          'f86422d6dd3fad8dca7dca5e6dad8324'],
  ['background-color', 'fc53fcb152c2a8210bc6e7a81cbdfda6'],
  ['padding',          'cd01ae587b327df6e77b0759e4b7c7c3'],
  ['color',            '5e4aaf9c830b4537f7bc1554b2e569ad'],
  ['font-size',        '04cf23df1529b5518a14aae06d926db0'],
  ['width',            'a64b23682fbe81c2d4c1c4ee3dce13cb'],
  ['height',           'dc8e6a2df3c2e5db2077e9b7dcc01cc8'],
  ['margin',           '81f22debbf9341d8f8bad0fef29c6320'],
  ['margin-left',      '752577de2d367ef6bf8496321901199d'],
  ['margin-right',     'f8e15f0b1acc024f733a527d6663f89d'],
  ['border-radius',    'bda323ca40991f3497381df2f7c46817'],
  ['flex-direction',   'c14e368b8aeb868c6e906fbb06f75d22'],
  ['align-items',      'a29962df9606c22cc38b8b793c119682'],
  ['justify-content',  '6cd1aa156dd0e09ea1646c5d1cea796f'],
]);
for (let [name, id] of properties) {
  builtinNameMatches.push({name: name, id: id});
}

const values = new Map([
  ['8623f6638bbdc2d25c773a98711a17c3', 'center'],
  ['625e8195abfcbc9d2aedad118c23bfbc', 'column'],
]);
for (let [id, name] of values) {
  builtinNameMatches.push({name: name, id: id});
}

function transpileCss(node) {
  var rules = graph.findNodesVia(node, _rules);
  return rules.map(transpileCssRule).join('');
}

function transpileCssRule(node) {
  var declarations = '';

  var selector = '';
  if (node === _body) {
    selector = 'body';
  }
  if (!selector) {
    for (let [name, id] of selectors) {
      var value = graph.findNodeVia(node, id);
      if (value) {
        if (name === 'id') {
          selector += `[id='${value}']`;
        } else if (name === 'class') {
          selector += `.${graph.getNameForId(value)}`;
        } else if (name === 'tag') {
          selector += graph.getNameForId(value);
        }
      }
    }
  }
  if (!selector) {
    selector = `[id="${node}"]`;
  }

  for (let [property, id] of properties) {
    var value = graph.findNodeVia(node, id);
    value = values.get(value) || graph.getNameForId(value);
    if (value) {
      declarations += `${property}: ${value};`;
    }
  }

  return `${selector} { ${declarations} }`;
}
