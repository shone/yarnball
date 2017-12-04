function compileHtml(node) {
  return Array.from(followListNodes(node, 'sibling')).map(currentNode => {
    var tag = findNodeVia(currentNode, 'tag');
    if (tag) {
      var child = findNodeVia(currentNode, 'child');
      if (child) {
        return '<' + tag.textContent + '>' + compileHtml(child) + '</' + tag.textContent + '>';
      }
      var content = findNodeVia(currentNode, 'content');
      if (content) {
        if (isJs(content)) {
          return '<' + tag.textContent + '>' + compileStatements(content) + '</' + tag.textContent + '>';
        } else {
          return '<' + tag.textContent + '>' + content.textContent + '</' + tag.textContent + '>';
        }
      }
      return '<' + tag.textContent + '></' + tag.textContent + '>';
    }
  }).join('');
}
