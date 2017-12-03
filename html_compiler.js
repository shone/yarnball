function compileHtml(node) {
  return Array.from(followListNodes(node, 'sibling')).map(currentNode => {
    var tagLink = Array.from(currentNode.links).find(link => link.from === currentNode && link.via.textContent === 'tag');
    if (tagLink) {
      var childLink = Array.from(currentNode.links).find(link => link.from === currentNode && link.via.textContent === 'child');
      if (childLink) {
        return '<' + tagLink.to.textContent + '>' + compileHtml(childLink.to) + '</' + tagLink.to.textContent + '>';
      }
      var contentLink = Array.from(currentNode.links).find(link => link.from === currentNode && link.via.textContent === 'content');
      if (contentLink) {
        if (isJs(contentLink.to)) {
          return '<' + tagLink.to.textContent + '>' + compileStatements(contentLink.to) + '</' + tagLink.to.textContent + '>';
        } else {
          return '<' + tagLink.to.textContent + '>' + contentLink.to.textContent + '</' + tagLink.to.textContent + '>';
        }
      }
      return '<' + tagLink.to.textContent + '></' + tagLink.to.textContent + '>';
    }
  }).join('');
}
