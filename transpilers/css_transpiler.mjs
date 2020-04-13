const cssSymbols = [];

const _rule     = '348b6fa30fc94e55378565889927dc7e'; cssSymbols.push({name: 'rule',    id: _rule});
const _nextPart = '7b4d5216c9d438a6cfca7259ce5940d2'; cssSymbols.push({name: '->',      id: _nextPart});

const selectors = new Map([
  ['#',      '79a0b037275b58db64688c341db0e45f'],
  ['.',      '17fb4cef59e502e243803bb54706b29b'],
  ['tag',    '55b040349bd16be47eb934032fd494fa'],
  [':',      '2e12c3086297f40f93a7d05ee6f06ccb'],
]);
for (const [name, id] of selectors) {
  cssSymbols.push({name: name, id: id});
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
  ['content',          '86812720a030b393cc19a754898e6832'],
  ['visibility',       '60664bc282ddd29aebccae7f5c3f784e'],
]);
for (const [name, id] of properties) {
  cssSymbols.push({name: name, id: id});
}

const values = new Map([
  ['8623f6638bbdc2d25c773a98711a17c3', 'center'],
  ['625e8195abfcbc9d2aedad118c23bfbc', 'column'],
]);
for (const [id, name] of values) {
  cssSymbols.push({name: name, id: id});
}

const cssSyntaxHighlighting = new CSSStyleSheet();
cssSyntaxHighlighting.replaceSync(cssSymbols.map(symbol => `[data-id="${symbol.id}"]`).join(',') + ' {color: #006ebd; font-weight: bold}');
document.adoptedStyleSheets = [...document.adoptedStyleSheets, cssSyntaxHighlighting];

function transpileCss(node) {
  const rules = graph.findNodesVia(node, _rule);
  return rules.map(transpileCssRule).join('');
}

function transpileCssRule(node) {
  let declarations = '';

  const selector = transpileCssSelector(node);

  for (const [property, id] of properties) {
    let value = graph.findNodeVia(node, id);
    value = values.get(value) || graph.getNameForId(value);
    if (value) {
      declarations += `${property}: ${value};`;
    }
  }

  return `${selector} { ${declarations} }`;
}

function transpileCssSelector(node) {
  const parts = graph.followListNodes(node, _nextPart);
  return parts.map(part => {
    let partString = '';
    for (const [name, id] of selectors) {
      const value = graph.findNodeVia(part, id);
      if (value) {
        if (name === '#') {
          partString += `[id='${value}']`;
        } else if (name === '.') {
          partString += `.${graph.getNameForId(value)}`;
        } else if (name === 'tag') {
          partString += graph.getNameForId(value);
        } else if (name === ':') {
          partString += `:${graph.getNameForId(value)}`;
        }
      }
    }
    if (!partString) {
      partString = `[id="${part}"]`;
    }
    return partString;
  }).join('');
}

