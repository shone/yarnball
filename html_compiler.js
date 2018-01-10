function compileHtml(node) {
  return followListNodes(node, 'next').map(currentNode => {
    var tag = findNodeVia(currentNode, 'tag');
    if (tag) {
      var child = findNodeVia(currentNode, 'child');
      if (child) {
        return '<' + tag.value + '>' + compileHtml(child) + '</' + tag.value + '>';
      }
      var content = findNodeVia(currentNode, 'text');
      if (content) {
        if (isJs(content)) {
          return '<' + tag.value + '>' + compileStatements(content) + '</' + tag.value + '>';
        } else {
          return '<' + tag.value + '>' + content.value + '</' + tag.value + '>';
        }
      }
      return '<' + tag.value + '></' + tag.value + '>';
    }
  }).join('');
}
