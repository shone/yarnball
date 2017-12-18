function createTable(baseNode, forwardNode) {
  var table = document.createElement('table');
  var tbody = document.createElement('tbody');
  table.appendChild(tbody);
  table.style.left = (parseFloat(baseNode.style.left) - 32) + 'px';
  table.style.top  = (parseFloat(baseNode.style.top)  - 32) + 'px';
  if (!forwardNode) {
    forwardNode = createNode({x: parseFloat(baseNode.style.left) - 64, y: parseFloat(baseNode.style.top)});
    table.downVia = forwardNode;
  } else {
    table.downVia = instanceNode(forwardNode, {x: parseFloat(baseNode.style.left) - 64, y: parseFloat(baseNode.style.top)});
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

  document.getElementById('nodes').appendChild(table);

  Array.from(table.getElementsByTagName('TD')).forEach(td => {
//     td.tableElementNode.style.top  = (table.offsetTop  + (td.offsetTop )  + 32) + 'px';
//     td.tableElementNode.style.left = (table.offsetLeft + (td.offsetLeft ) + 32) + 'px';
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
  var elementStartPositions = new Map();
  elementsToMove.forEach(element => elementStartPositions.set(element, {x: parseFloat(element.style.left), y: parseFloat(element.style.top)}));
  handleMouseDrag(event, {
    mousemove: function (cursor) {
      elementsToMove.forEach(element => {
        var startPosition = elementStartPositions.get(element);
        element.style.left = (startPosition.x + pxToGrid(cursor.deltaTotal.x)) + 'px';
        element.style.top  = (startPosition.y + pxToGrid(cursor.deltaTotal.y)) + 'px';
      });
      affectedLinks.forEach(layoutLink);
    },
  });
  return false;
}

function fitTableCellsToAttachedNodes(table) {
  var affectedLinks = new Set();
  var currentOffset = 0;
  Array.from(table.getElementsByTagName('TD')).forEach(td => {
    td.tableElementNode.style.top  = (parseFloat(table.style.top)  + (td.offsetTop) + 32) + 'px';
    td.tableElementNode.style.left = (parseFloat(table.style.left) + 32) + 'px';
    td.tableElementNode.links.forEach(link => affectedLinks.add(link));
    var tdWidth  = 64;
    var tdHeight = 64;
    td.attachedNodes.forEach(node => {
      if (node !== td.tableElementNode && currentOffset !== 0) {
        node.style.top = (parseFloat(node.style.top) + currentOffset) + 'px';
        node.links.forEach(link => affectedLinks.add(link));
      }
      var tdWidthRequired = ((parseFloat(node.style.left) + parseFloat(node.style.width)) - parseFloat(table.style.left)) - 16;
      if (tdWidthRequired > tdWidth) {
        tdWidth = tdWidthRequired;
      }
      var tdHeightRequired = (parseFloat(node.style.top) - (parseFloat(table.style.top) + td.offsetTop)) + 32;
      if (tdHeightRequired > tdHeight) {
        tdHeight = tdHeightRequired;
      }
    });
    currentOffset += tdHeight - parseFloat(td.style.height);
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

function getTableLinks(table) {
  var links = [];
  var previousNode = null;
  getTableNodes(table).forEach(node => {
    if (previousNode) {
      node.links.forEach(link => {
        if (link.from === previousNode && link.via.instances.has(table.downVia) && link.to === node) {
          links.push(link);
        }
      });
    }
    previousNode = node;
  });
  return links;
}

function rebuildTable(table, nodes) {
  var trs = Array.from(table.rows);
  var oldTrPositions = new Map();
  trs.forEach(tr => oldTrPositions.set(tr, tr.offsetTop));

  // Destroy all existing links between table elements
  getTableLinks(table).forEach(link => {
    link.via.instances.delete(link.via);
    link.via.remove();
    link.from.links.delete(link);
    link.to.links.delete(link);
    link.remove();
  });

  // Destroy rows that no longer have an associated node
  var deletedTrs = trs.filter(tr => !nodes.find(node => node.attachedTableCell && node.attachedTableCell.parentElement === tr));
  deletedTrs.forEach(tr => {
    var td = tr.getElementsByTagName('TD')[0];
    td.attachedNodes.forEach(node => delete node.attachedTableCell);
    delete td.attachedNodes;
  });

  // Detach all rows so they can be re-attached in the new order
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
      td.style.width  = '64px';
      td.style.height = '64px';
      table.tBodies[0].appendChild(tr);
      node.style.left = (table.offsetLeft + 32) + 'px';
      node.style.top = (table.offsetTop + tr.offsetTop + 32) + 'px';
    }
  });

  var previousNode = null;
  nodes.forEach(node => {
    if (previousNode) {
      var via = createNode({x: parseFloat(node.style.left) - 64, y: parseFloat(node.style.top) - 64}, table.downVia.textContent);
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
    if (document.activeElement && document.activeElement.classList.contains('node') && document.activeElement.attachedTableCell
      && document.activeElement.attachedTableCell.tableElementNode === document.activeElement) {
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
  } /*else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
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
  }*/
}

function handleKeypressForTable(event) {
  if (event.key === 't') {
    var selectedNodes = Array.from(document.querySelectorAll('.node.selected'));
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      event.preventDefault();
      if (document.activeElement.attachedTableCell) {
        var table = document.activeElement.attachedTableCell.closest('table');
        var links = getTableLinks(table);
        links.forEach(link => {
          link.classList.remove('hidden');
          link.from.classList.remove('hidden');
          link.via.classList.remove('hidden');
          link.to.classList.remove('hidden');
        });
        Array.from(table.getElementsByTagName('TD')).forEach(td => {
          td.attachedNodes.forEach(node => delete node.attachedTableCell);
        });
        table.downVia.remove();
        table.remove();
      } else {
        var baseNode = document.activeElement;
        var forwardNode = null;
        if (selectedNodes.length === 2) {
          var otherSelectedNode = selectedNodes[0] === document.activeElement ? selectedNodes[1] : selectedNodes[0];
          if (Array.from(baseNode.links).find(link => link.from === baseNode && link.via === otherSelectedNode)) {
            forwardNode = otherSelectedNode;
          }
        }
        createTable(baseNode, forwardNode);
      }
      return false;
    }
  }
}
