function compileHtml(node) {
  return followListNodes(node, 'next').map(currentNode => {
    var tag = findNodeVia(currentNode, 'tag');
    if (tag) {
      if (tag.value === 'script') {
        var text = findNodeVia(currentNode, 'text');
        if (text) {
          return '<script>' + compileStatements(text) + '</script>';
        } else {
          return '<script></script>';
        }
      } else {
        var child = findNodeVia(currentNode, 'child');
        if (child) {
          return '<' + tag.value + '>' + compileHtml(child) + '</' + tag.value + '>';
        }
        var text = findNodeVia(currentNode, 'text');
        if (text) {
          return '<' + tag.value + '>' + text.value + '</' + tag.value + '>';
        } else {
          return '<' + tag.value + '></' + tag.value + '>';
        }
      }
    }
  }).join('');
}
