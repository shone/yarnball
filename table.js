function layoutTable(table) {
  var affectedLinks = new Set();
  Array.from(table.getElementsByTagName('TD')).forEach(td => {
    td.tableElementNode.style.top  = (table.offsetTop  + td.offsetTop  + 50) + 'px';
    td.tableElementNode.style.left = (table.offsetLeft + td.offsetLeft + 50) + 'px';
    td.tableElementNode.links.forEach(link => affectedLinks.add(link));
    var tdWidth  = 100;
    var tdHeight = 100;
    td.attachedNodes.forEach(node => {
      var tdWidthRequired = (node.offsetLeft - (table.offsetLeft + td.offsetLeft)) + node.offsetWidth + 20;
      if (tdWidthRequired > tdWidth) {
        tdWidth = tdWidthRequired;
      }
      var tdHeightRequired = (node.offsetTop - (table.offsetTop + td.offsetTop)) + node.offsetHeight + 20;
      if (tdHeightRequired > tdHeight) {
        tdHeight = tdHeightRequired;
      }
    });
    td.style.width  = tdWidth + 'px';
    td.style.height = tdHeight + 'px';
  });
  affectedLinks.forEach(layoutLink);
}
