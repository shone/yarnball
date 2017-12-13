function createTable(baseNode, forwardNode) {
  var table = document.createElement('table');
  var tbody = document.createElement('tbody');
  table.appendChild(tbody);
  table.style.left = (parseFloat(baseNode.style.left) - 45) + 'px';
  table.style.top  = (parseFloat(baseNode.style.top)  - 45) + 'px';
  if (!forwardNode) {
    forwardNode = createNode({x: parseFloat(baseNode.style.left) - 85, y: parseFloat(baseNode.style.top)});
    table.downVia = forwardNode;
  } else {
    table.downVia = instanceNode(forwardNode, {x: parseFloat(baseNode.style.left) - 85, y: parseFloat(baseNode.style.top)});
  }
  var previousNode = null;
  followListNodes(baseNode, forwardNode).forEach(node => {
    var tr = document.createElement('tr');
    tbody.appendChild(tr);
    var td = document.createElement('td');
    tr.appendChild(td);
    td.tableElementNode = node;
    td.attachedNodes = new Set([node]);
    node.attachedTableCell = td;
    if (previousNode) {
      var link = Array.from(node.links).find(link => link.from === previousNode && link.via.instances.has(forwardNode) && link.to === node);
      if (link) {
        td.attachedDownLink = link;
        td.attachedDownViaNode = link.via;
      }
    }
    previousNode = node;
  });

  graph.appendChild(table);

  Array.from(table.getElementsByTagName('TD')).forEach(td => {
    td.tableElementNode.style.top  = (table.offsetTop  + td.offsetTop  + 45) + 'px';
    td.tableElementNode.style.left = (table.offsetLeft + td.offsetLeft + 45) + 'px';
    if (td.attachedDownLink) {
      td.attachedDownLink.classList.add('hidden');
      td.attachedDownLink.classList.remove('selected');

      td.attachedDownLink.via.classList.add('hidden');
      td.attachedDownLink.via.classList.remove('selected');
    }
  });
  fitTableCellsToAttachedNodes(table);
  return table;
}

function handleTableMousedown(event) {
  event.preventDefault();
  var table = event.target;
  var elementsToMove = new Set([table, table.downVia]);
  var affectedLinks = new Set();
  var tableElementNodes = getTableNodes(table);
  tableElementNodes.forEach(node => {
    node.links.forEach(link => {
      if (link.from.attachedTableCell && link.from.attachedTableCell.tableElementNode === link.from &&
          link.via.instances.has(table.downVia) &&
          link.to.attachedTableCell && link.to.attachedTableCell.tableElementNode === link.to) {
        elementsToMove.add(link.via);
        affectedLinks.add(link);
      }
    });
  });
  Array.from(table.getElementsByTagName('TD')).forEach(td => {
    td.attachedNodes.forEach(node => {
      elementsToMove.add(node);
      node.links.forEach(link => affectedLinks.add(link));
    });
  });
  handleMouseDrag(event, {
    mousemove: function (cursor) {
      elementsToMove.forEach(element => {
        element.style.left = (parseFloat(element.style.left) + cursor.delta.x) + 'px';
        element.style.top  = (parseFloat(element.style.top)  + cursor.delta.y) + 'px';
      });
      affectedLinks.forEach(layoutLink);
    },
  });
  return false;
}

function fitTableCellsToAttachedNodes(table) {
  var affectedLinks = new Set();
  Array.from(table.getElementsByTagName('TD')).forEach(td => {
    td.tableElementNode.style.top  = (parseFloat(table.style.top)  + td.offsetTop  + 45) + 'px';
    td.tableElementNode.style.left = (parseFloat(table.style.left) + td.offsetLeft + 45) + 'px';
    td.tableElementNode.links.forEach(link => affectedLinks.add(link));
    var tdWidth  = 40;
    var tdHeight = 40;
    td.attachedNodes.forEach(node => {
      var tdWidthRequired = (node.offsetLeft - (parseFloat(table.style.left) + td.offsetLeft)) + node.offsetWidth + 20;
      if (tdWidthRequired > tdWidth) {
        tdWidth = tdWidthRequired;
      }
      var tdHeightRequired = (node.offsetTop - (parseFloat(table.style.top) + td.offsetTop)) + node.offsetHeight + 20;
      if (tdHeightRequired > tdHeight) {
        tdHeight = tdHeightRequired;
      }
    });
    td.style.width  = tdWidth + 'px';
    td.style.height = tdHeight + 'px';
  });
  affectedLinks.forEach(layoutLink);
}

function isTableElementNode(node) {
  return node.attachedTableCell && node.attachedTableCell.tableElementNode === node;
}

function getTableNodes(table) {
  return Array.from(table.rows).map(tr => tr.cells[0].tableElementNode);
}

function rebuildTable(table, nodes) {
  var trs = Array.from(table.rows);
  var oldTrPositions = new Map();
  trs.forEach(tr => oldTrPositions.set(tr, tr.offsetTop));

  getTableNodes(table).forEach(node => {
    node.links.forEach(link => {
      if (link.from.attachedTableCell && link.from.attachedTableCell.tableElementNode === link.from &&
          link.via.instances.has(table.downVia) &&
          link.to.attachedTableCell && link.to.attachedTableCell.tableElementNode === link.to) {
        link.via.remove();
        link.remove();
      }
    });
  });

  var deletedTrs = trs.filter(tr => !nodes.find(node => node.attachedTableCell && node.attachedTableCell.parentElement === tr));
  deletedTrs.forEach(tr => {
    var td = tr.getElementsByTagName('TD')[0];
    td.attachedNodes.forEach(node => delete node.attachedTableCell);
    delete td.attachedNodes;
  });

  trs.forEach(tr => tr.remove());

  var affectedLinks = new Set();
  nodes.forEach(node => {
    if (node.attachedTableCell) {
      var tr = node.attachedTableCell.parentElement;
      table.tBodies[0].appendChild(tr)
      var trDeltaY = oldTrPositions.get(tr) - tr.offsetTop;
      node.attachedTableCell.attachedNodes.forEach(attachedNode => {
        attachedNode.style.top = (parseFloat(attachedNode.style.top) - trDeltaY) + 'px';
        attachedNode.links.forEach(link => affectedLinks.add(link));
      });
    } else {
      var tr = document.createElement('tr');
      var td = document.createElement('td');
      tr.appendChild(td);
      node.attachedTableCell = td;
      td.tableElementNode = node;
      td.attachedNodes = new Set([node]);
      tr.style.width  = '90px';
      tr.style.height = '90px';
      table.tBodies[0].appendChild(tr);
      node.style.left = (table.offsetLeft + 45) + 'px';
      node.style.top = (table.offsetTop + tr.offsetTop + 45) + 'px';
    }
  });

  var previousNode = null;
  nodes.forEach(node => {
    if (previousNode) {
      var via = createNode({x: parseFloat(table.style.left) - 45, y: parseFloat(node.style.top) - 45}, table.downVia.textContent);
      via.instances = table.downVia.instances;
      via.instances.add(via);
      if (!table.downVia) table.downVia = via;
      var link = createLink({from: previousNode, via: via, to: node});
      via.classList.add('hidden');
      link.classList.add('hidden');
      affectedLinks.add(link);
    }
    previousNode = node;
  });

  affectedLinks.forEach(layoutLink);
}

function handleKeydownForTable(event) {
  if (event.key === 'Enter' && event.ctrlKey) {
    if (document.activeElement && document.activeElement.classList.contains('node') && document.activeElement.attachedTableCell) {
      event.preventDefault();
      var table = document.activeElement.attachedTableCell.closest('table');
      var tableNodes = getTableNodes(table);
      var newNode = createNode();
      tableNodes.splice(tableNodes.indexOf(document.activeElement) + 1, 0, newNode);
      rebuildTable(table, tableNodes);
      document.activeElement.classList.remove('selected');
      newNode.focus();
      newNode.classList.add('selected');
      return false;
    }
  } else if (event.ctrlKey && event.shiftKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    if (document.activeElement && document.activeElement.classList.contains('node') && isTableElementNode(document.activeElement)) {
      event.preventDefault();
      var table = document.activeElement.attachedTableCell.closest('table');
      var tableNodes = getTableNodes(table);
      var index = tableNodes.indexOf(document.activeElement);
      if (event.key === 'ArrowDown' && index < tableNodes.length) {
        tableNodes.splice(index, 1);
        tableNodes.splice(index + 1, 0, document.activeElement);
      } else if (event.key === 'ArrowUp' && index > 0) {
        tableNodes.splice(index, 1);
        tableNodes.splice(index - 1, 0, document.activeElement);
      }
      rebuildTable(table, tableNodes);
      return false;
    }
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      if (isTableElementNode(document.activeElement)) {
        event.preventDefault();
        var table = document.activeElement.attachedTableCell.closest('table');
        var tableNodes = getTableNodes(table);
        var index = tableNodes.indexOf(document.activeElement);
        if (event.key === 'ArrowDown') {
          index++;
        } else {
          index--;
        }
        if (index >= 0 && index < tableNodes.length) {
          if (!event.shiftKey) {
            Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
          }
          tableNodes[index].focus();
          tableNodes[index].classList.add('selected');
        }
        return false;
      }
    }
  }
}

function handleKeypressForTable(event) {
  if (event.key === 't') {
    var selectedNodes = Array.from(document.querySelectorAll('.node.selected'));
    if (document.activeElement) {
      event.preventDefault();
      var baseNode = document.activeElement;
      var forwardNode = null;
      if (selectedNodes.length === 2) {
        var otherSelectedNode = selectedNodes[0] === document.activeElement ? selectedNodes[1] : selectedNodes[0];
        if (Array.from(baseNode.links).find(link => link.from === baseNode && link.via === otherSelectedNode)) {
          forwardNode = otherSelectedNode;
        }
      }
      createTable(baseNode, forwardNode);
      return false;
    }
  }
}
