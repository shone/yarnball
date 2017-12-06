if (localStorage.saved_state) {
  restoreState();
}

var graph = document.getElementById('graph');

var cursorOnMousedownPosition = {x: 0, y: 0};
var lastCursorPosition = {x: 0, y: 0};

var cursorPositionOnMouseDragStart = null;
var cursorPositionOnLastDragMousemove = null;
var cursorScreenPositionOnLastDragMousemove = null;
function handleMouseDrag(event, options) {
  function handleMousemove(event) {
    if (options.mousemove) {
      var position = {x: event.pageX, y: event.pageY};
      var positionScreen = {x: event.screenX, y: event.screenY};
      var delta = {x: position.x - cursorPositionOnLastDragMousemove.x, y: position.y - cursorPositionOnLastDragMousemove.y};
      var deltaScreen = {x: positionScreen.x - cursorScreenPositionOnLastDragMousemove.x, y: positionScreen.y - cursorScreenPositionOnLastDragMousemove.y};
      cursorPositionOnLastDragMousemove = position;
      cursorScreenPositionOnLastDragMousemove = positionScreen;
      options.mousemove({position: position, delta: delta, deltaScreen: deltaScreen});
    }
  }
  function handleMouseup(event) {
    window.removeEventListener('mousemove', handleMousemove);
    window.removeEventListener('mouseup',   handleMouseup);
    if (options.mouseup) {
      options.mouseup();
    }
  }
  cursorPositionOnMouseDragStart = {x: event.pageX, y: event.pageY};
  cursorPositionOnLastDragMousemove = cursorPositionOnMouseDragStart;
  cursorScreenPositionOnLastDragMousemove = {x: event.screenX, y: event.screenY};
  window.addEventListener('mousemove', handleMousemove);
  window.addEventListener('mouseup',   handleMouseup);
}

function findLinkVia(node, via) {
  for (var instance of node.instances) {
    var link = Array.from(instance.links).find(link => link.from.instances.has(node) && (link.via.textContent === via || link.via.instances.has(via)));
    if (link) return link;
  }
  return null;
}

function findNodeVia(node, via) {
  var link = findLinkVia(node, via);
  return link ? link.to : null;
}

function* followListLinks(node, forward) {
  do {
    var forwardLink = Array.from(node.links).find(link => link.from === node && (link.via.textContent === forward || link.via.instances.has(forward)));
    if (forwardLink) {
      yield forwardLink;
    }
    node = forwardLink ? forwardLink.to : null;
  } while(node)
}

function* followListNodes(node, forward) {
  do {
    yield node;
    node = findNodeVia(node, forward) || null;
  } while(node)
}

function createNode(position, text) {
  var node = document.createElement('div');
  node.classList.add('node');
  node.textContent = text;
  node.setAttribute('tabindex', '0');
  node.style.left = String(position.x) + 'px';
  node.style.top  = String(position.y) + 'px';
  node.instances = new Set([node]);
  node.links = new Set();
  graph.appendChild(node);
  return node;
}

function createLink(options) {
  var link = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  link.classList.add('link');
  link.setAttribute('marker-end', 'url(#Triangle)');
  document.getElementById('links-svg').appendChild(link);
  if (options) {
    if (options.from) {
      link.from = options.from;
      options.from.links.add(link);
    }
    if (options.via) {
      link.via = options.via;
      options.via.links.add(link);
    }
    if (options.to) {
      link.to = options.to;
      options.to.links.add(link);
    }
  }
  return link;
}

// Node dragging
var currentDragdropTarget = null;
function handleNodeMousedown(event) {
  if (event.button === 0) {
    event.preventDefault();
    event.stopPropagation();
    event.target.focus();
    var clickedNodes = new Set([event.target]);
    if (event.target.collapsedNodes) {
      event.target.collapsedNodes.forEach(node => clickedNodes.add(node));
    }
    if (event.shiftKey) {
      clickedNodes.forEach(node => {node.classList.toggle('selected')});
    } else {
      if (!event.target.classList.contains('selected')) {
        Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
      }
      clickedNodes.forEach(node => {node.classList.add('selected')});
    }
    Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.add('dragging'));
    Array.from(document.getElementsByTagName('TD')).forEach(td => td.classList.add('drag-drop-target'));
    window.addEventListener('mouseover', handleNodeDragMouseover);
    window.addEventListener('mouseout',  handleNodeDragMouseout);
    handleMouseDrag(event, {
      mousemove: function(cursor) {
        var affectedLinks = new Set();
        document.querySelectorAll('.node.selected').forEach(node => {
          node.style.left = (parseFloat(node.style.left) + cursor.delta.x) + 'px';
          node.style.top  = (parseFloat(node.style.top)  + cursor.delta.y) + 'px';
          node.links.forEach(link => affectedLinks.add(link));
        });
        affectedLinks.forEach(link => {
          layoutLink(link);
        });
      },
      mouseup: function() {
        window.removeEventListener('mouseover', handleNodeDragMouseover);
        window.removeEventListener('mouseout',  handleNodeDragMouseout);
        Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('dragging'));

        Array.from(document.querySelectorAll('.node.selected')).forEach(node => {
          if (node.attachedTableCell) {
            node.attachedTableCell.attachedNodes.delete(node);
            node.attachedTableCell = null;
          }
        });
        if (currentDragdropTarget && currentDragdropTarget.tagName === 'TD') {
          var td = currentDragdropTarget;
          Array.from(document.querySelectorAll('.node.selected')).forEach(node => {
            td.attachedNodes.add(node);
            node.attachedTableCell = td;
          });
          layoutTable(td.parentElement.parentElement);
        }
        Array.from(document.getElementsByTagName('TD')).forEach(td => td.classList.remove('drag-drop-target'));
        currentDragdropTarget = null;
      }
    });
    return false;
  }
}
function handleNodeDragMouseover(event) {
  if (event.target.tagName === 'TD') {
    currentDragdropTarget = event.target;
  }
}
function handleNodeDragMouseout(event) {
  if (event.target === currentDragdropTarget) {
    currentDragdropTarget = null;
  }
}

graph.addEventListener('dblclick', (event) => {
  if (event.target.classList.contains('node')) {
    event.target.instances.forEach(node => {
      if (!node.classList.contains('hidden')) {
        node.classList.add('selected')
      }
    });
  } else if (event.target.classList.contains('link')) {
    if (!event.target.classList.contains('collapsed')) {
      var connectedLinks = new Set([event.target]);
      var connectedNodes = new Set([event.target.from, event.target.via, event.target.to]);
      getAllConnectedNodesAndLinks(event.target.to, connectedNodes, connectedLinks);
      connectedNodes.delete(event.target.from);
      connectedNodes.forEach(node => {node.classList.add('selected')});
    }
  }
});

function getClosestNodeTo(position, nodes) {
  nodes = nodes || Array.from(document.getElementsByClassName('node')).filter(node => !node.classList.contains('hidden'));
  var closestNode = null;
  var closestNodeDistance = null;
  for (var node of nodes) {
    var nodePosition = {x: parseFloat(node.style.left), y: parseFloat(node.style.top)};
    var delta = {x: position.x - nodePosition.x, y: position.y - nodePosition.y};
    var distance = (delta.x * delta.x) + (delta.y * delta.y);
    if (!closestNode || distance < closestNodeDistance) {
      closestNode = node;
      closestNodeDistance = distance;
    }
  }
  return closestNode;
}

// Selection box
var selectionBox = document.getElementById("selection-box");
var selectionBoxPosition = {left: 0, top: 0, right: 0, bottom: 0};
function updateSelectionBox() {
  selectionBox.style.left   =  selectionBoxPosition.left   + 'px';
  selectionBox.style.top    =  selectionBoxPosition.top    + 'px';
  selectionBox.style.width  = (selectionBoxPosition.right  - selectionBoxPosition.left) + 'px';
  selectionBox.style.height = (selectionBoxPosition.bottom - selectionBoxPosition.top)  + 'px';
}
var selectedNodesToPreserve = null;
function handleBackgroundMousedownForSelectionBox(event) {
  if (event.target !== graph) return;
  event.preventDefault();
  if (!event.shiftKey) {
    Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
    if (document.activeElement) document.activeElement.blur();
  } else {
    selectedNodesToPreserve = new Set(Array.from(document.getElementsByClassName('selected')));
  }
  handleMouseDrag(event, {
    mousemove: function(cursor) {
      selectionBoxPosition.left   = Math.min(cursorPositionOnMouseDragStart.x, cursor.position.x);
      selectionBoxPosition.top    = Math.min(cursorPositionOnMouseDragStart.y, cursor.position.y);
      selectionBoxPosition.right  = Math.max(cursorPositionOnMouseDragStart.x, cursor.position.x);
      selectionBoxPosition.bottom = Math.max(cursorPositionOnMouseDragStart.y, cursor.position.y);
      updateSelectionBox();
      var visibleNodes = Array.from(document.getElementsByClassName('node')).filter(node => !node.classList.contains('hidden'));
      visibleNodes.forEach(node => {
        if (selectedNodesToPreserve && selectedNodesToPreserve.has(node)) return;
        var inSelectionBox = !(
          ((parseFloat(node.style.left) + (node.offsetWidth  - 25)) < selectionBoxPosition.left)  ||
          ((parseFloat(node.style.left) - 25)                       > selectionBoxPosition.right) ||
          ((parseFloat(node.style.top)  + (node.offsetHeight - 25)) < selectionBoxPosition.top)   ||
          ((parseFloat(node.style.top)  - 25)                       > selectionBoxPosition.bottom)
        );
        node.classList.toggle('selected', inSelectionBox);
        if (node.collapsedNodes) {
          node.collapsedNodes.forEach(node => node.classList.toggle('selected', inSelectionBox));
        }
      });
      var closestNode = getClosestNodeTo({x: event.pageX, y: event.pageY}, Array.from(document.querySelectorAll('.node.selected')));
      if (closestNode) {
        closestNode.focus();
      } else {
        if (document.activeElement) document.activeElement.blur();
      }
    },
    mouseup: function() {
      selectionBoxPosition = {left: 0, top: 0, right: 0, bottom: 0};
      updateSelectionBox();
      selectedNodesToPreserve = null;
    }
  });
  selectionBoxPosition = {left: 0, top: 0, right: 0, bottom: 0};
  updateSelectionBox();
  return false;
}

// Node renaming
var renameInput = null;
document.body.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    if (!renameInput) {
      if (document.activeElement && document.activeElement.classList.contains('node')) {
        renameInput = document.createElement('input');
        renameInput.value = document.activeElement.textContent;
        document.activeElement.textContent = '';
        renameInput.select();
        document.activeElement.appendChild(renameInput);
        renameInput.focus();
      }node.links.forEach(link => affectedLinks.add(link));
    } else {
      renameInput.parentElement.focus();
      renameInput.parentElement.instances.forEach(node => {node.textContent = renameInput.value});
      renameInput.remove();
      renameInput = null;
    }
  } else if (event.ctrlKey && event.shiftKey && event.key === 'ArrowDown') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      var td = document.activeElement.attachedTableCell;
      if (td && td.parentElement.nextElementSibling) {
        var tr = td.parentElement;
        var affectedLinks = new Set();
        td.attachedNodes.forEach(node => {
          node.style.top = (parseFloat(node.style.top) + tr.nextElementSibling.offsetHeight) + 'px';
          node.links.forEach(link => affectedLinks.add(link));
        });
        tr.nextElementSibling.getElementsByTagName('TD')[0].attachedNodes.forEach(node => {
          node.style.top = (parseFloat(node.style.top) - tr.offsetHeight) + 'px';
          node.links.forEach(link => affectedLinks.add(link));
        });
        tr.nextElementSibling.insertAdjacentElement('afterend', tr);
        affectedLinks.forEach(layoutLink);
      }
    }
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    if (document.activeElement && document.activeElement.classList.contains('node') &&
        document.activeElement.attachedTableCell) {
      if (document.activeElement.attachedTableCell.tableElementNode === document.activeElement) {
        event.preventDefault();
        var td = document.activeElement.attachedTableCell;
        var tableNodeToFocus = null;
        if (event.key === 'ArrowUp') {
          if (td.parentElement.previousElementSibling) {
            tableNodeToFocus = td.parentElement.previousElementSibling.getElementsByTagName('TD')[0].tableElementNode;
          }
        } else {
          if (td.parentElement.nextElementSibling) {
            tableNodeToFocus = td.parentElement.nextElementSibling.getElementsByTagName('TD')[0].tableElementNode;
          }
        }
        if (tableNodeToFocus) {
          Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
          tableNodeToFocus.focus();
          tableNodeToFocus.classList.add('selected');
        }
        return false;
      }
    }
  }
});

function duplicateNodes(nodes) {
  var affectedLinks = new Set();
  var duplicatedNodesMap = new Map();
  nodes = new Set(nodes);
  nodes.forEach(node => {
    node.links.forEach(link => affectedLinks.add(link));
    var nodeInstance = createNode({x: parseFloat(node.style.left) + 10, y: parseFloat(node.style.top) + 10});
    nodeInstance.textContent = node.textContent;
    node.instances.add(nodeInstance);
    nodeInstance.instances = node.instances;
    node.classList.remove('selected');
    nodeInstance.classList.add('selected');
    duplicatedNodesMap.set(node, nodeInstance);
  });
  affectedLinks = new Set(Array.from(affectedLinks).filter(link => {
    return nodes.has(link.from) && nodes.has(link.via) && nodes.has(link.to);
  }));
  affectedLinks.forEach(link => {
    var duplicatedLink = createLink({
      from: duplicatedNodesMap.get(link.from),
      via:  duplicatedNodesMap.get(link.via),
      to:   duplicatedNodesMap.get(link.to),
    });
    layoutLink(duplicatedLink);
  });
}

document.addEventListener('keypress', event => {
  if (renameInput) return;
  if (event.key === 'd') {
    var selectedNodes = Array.from(document.querySelectorAll('.node.selected'));
    if (selectedNodes.length > 0) {
      event.preventDefault();
      duplicateNodes(selectedNodes);
      return false;
    }
  } else if (event.key === 'Delete') {
    var selectedElements = Array.from(document.getElementsByClassName('selected'));
    if (selectedElements.length > 0) {
      event.preventDefault();
      var affectedLinks = new Set();
      selectedElements.forEach(element => {
        if (element.classList.contains('node')) {
          element.instances.delete(element);
          element.links.forEach(link => affectedLinks.add(link));
          element.remove();
        } else if (element.classList.contains('link')) {
          affectedLinks.add(element);
        }
      });
      affectedLinks.forEach(link => {
        link.from.links.delete(link);
        link.via.links.delete(link);
        link.to.links.delete(link);
        link.remove()
      });
      return false;
    }
  } else if (event.key === 'g') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      console.log(compileStatements(document.activeElement));
    }
  } else if (event.key === 'f') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      var f = new Function([], compileStatements(document.activeElement));
      var returnValue = f();
      if (typeof returnValue !== 'undefined') {
        if (typeof returnValue.then === 'function') {
          returnValue.then(promisedValue => {
            if (typeof promisedValue === 'object') {
              document.activeElement.classList.remove('selected');
              makeJsonGraph(promisedValue, {x: parseFloat(document.activeElement.style.left), y: parseFloat(document.activeElement.style.top)});
            }
          });
        } else if (typeof returnValue === 'object') {
          document.activeElement.classList.remove('selected');
          makeJsonGraph(returnValue, {x: parseFloat(document.activeElement.style.left), y: parseFloat(document.activeElement.style.top)});
        }
      }
    }
  } else if (event.key === 'j') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      console.log(compileHtml(document.activeElement));
    }
  } else if (event.key === 'h') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      Array.from(document.getElementsByTagName('iframe')).forEach(iframe => iframe.remove());
      var html = compileHtml(document.activeElement);
      var iFrame = document.createElement('iframe');
      iFrame.src = 'data:text/html;charset=utf-8,' + encodeURI(html);
      document.body.appendChild(iFrame);
    }
  } else if (event.key === 'S' && event.shiftKey && event.ctrlKey) {
    saveState();
  } else if (event.key === 'F' && event.shiftKey && event.ctrlKey) {
    restoreState();
  } else if (event.key === '-' || event.key === '+' || event.key === '=') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      if (event.key === '-') {
        if (document.querySelectorAll('.node.selected').length > 1) {
          var collapsedNodes = new Set(document.querySelectorAll('.node.selected'));
          var collapsedLinks = new Set();
          collapsedNodes.delete(document.activeElement);
          collapsedNodes.forEach(node => {
            node.classList.add('hidden');
            node.links.forEach(link => collapsedLinks.add(link));
          });
          collapsedLinks.forEach(link => {
            link.classList.add('hidden');
          });
          document.activeElement.collapsedNodes = collapsedNodes;
          document.activeElement.collapsedLinks = collapsedLinks;
          document.activeElement.classList.add('collapsed');
        }
      } else {
        if (document.activeElement.collapsedNodes) {
          document.activeElement.collapsedNodes.forEach(node => node.classList.remove('hidden'));
          document.activeElement.collapsedNodes = null;
        }
        if (document.activeElement.collapsedLinks) {
          document.activeElement.collapsedLinks.forEach(link => link.classList.remove('hidden'));
          document.activeElement.collapsedLinks = null;
        }
        document.activeElement.classList.remove('collapsed');
      }
    }
  } else if (event.key === 't') {
    var selectedNodes = Array.from(document.querySelectorAll('.node.selected'));
    if (selectedNodes.length === 2) {
      var baseNode = document.activeElement;
      var forwardNode = selectedNodes[0] === document.activeElement ? selectedNodes[1] : selectedNodes[0];
      var table = document.createElement('table');
      table.style.left = baseNode.style.left;
      table.style.top  = baseNode.style.top;
      graph.appendChild(table);
      var lastNode = null;
      for (var link of followListLinks(baseNode, forwardNode)) {
        var tr = document.createElement('tr');
        table.appendChild(tr);
        var td = document.createElement('td');
        tr.appendChild(td);
        td.tableElementNode = link.from;
        td.attachedDownLink = link;
        td.attachedDownViaNode = link.via;
        td.attachedNodes = new Set([link.from]);
        lastNode = link.to;
      }
      var tr = document.createElement('tr');
      table.appendChild(tr);
      var td = document.createElement('td');
      tr.appendChild(td);
      td.tableElementNode = lastNode;
      td.attachedNodes = new Set([lastNode]);

      var affectedLinks = new Set();
      Array.from(table.getElementsByTagName('TD')).forEach(td => {
        td.tableElementNode.style.top  = (table.offsetTop  + td.offsetTop  + 50) + 'px';
        td.tableElementNode.style.left = (table.offsetLeft + td.offsetLeft + 50) + 'px';
        td.tableElementNode.links.forEach(link => affectedLinks.add(link));
        if (td.attachedDownLink) {
          td.attachedDownLink.classList.add('hidden');
          td.attachedDownLink.via.classList.add('hidden');
        }
      });
      affectedLinks.forEach(layoutLink);
    }
  }
});

function getAllConnectedNodesAndLinks(node, connectedNodes, connectedLinks) {
  connectedNodes = connectedNodes || new Set();
  connectedLinks = connectedLinks || new Set();
  node.links.forEach(link => {
    if (!connectedLinks.has(link)) {
      connectedLinks.add(link);
      if (!connectedNodes.has(link.from)) {
        connectedNodes.add(link.from);
        getAllConnectedNodesAndLinks(link.from, connectedNodes, connectedLinks);
      }
      if (!connectedNodes.has(link.via)) {
        connectedNodes.add(link.via);
        getAllConnectedNodesAndLinks(link.via, connectedNodes, connectedLinks);
      }
      if (!connectedNodes.has(link.to)) {
        connectedNodes.add(link.to);
        getAllConnectedNodesAndLinks(link.to, connectedNodes, connectedLinks);
      }
    }
  });
  return {
    nodes: connectedNodes,
    links: connectedLinks,
  }
}

function layoutLink(link, lastPosition) {
  function pos(node) {
    return parseFloat(node.style.left) + ',' + parseFloat(node.style.top);
  }
  if (link.to) {
    if (link.classList.contains('collapsed')) {
      link.setAttribute('points', [pos(link.from), pos(link.via)].join(' '));
    } else {
      link.setAttribute('points', [pos(link.from), pos(link.via), pos(link.to)].join(' '));
    }
  } else if (link.via) {
    link.setAttribute('points', [pos(link.from), pos(link.via), lastPosition.x + ',' + lastPosition.y].join(' '));
  } else {
    link.setAttribute('points', [pos(link.from), lastPosition.x + ',' + lastPosition.y].join(' '));
  }
}

document.addEventListener('contextmenu', event => event.preventDefault());
graph.addEventListener('mousedown', event => {
  if (event.button === 0 && event.ctrlKey && event.shiftKey) {
    event.preventDefault();
    var node = createNode({x: event.pageX, y: event.pageY});
    Array.from(document.getElementsByClassName('selected')).forEach(node => {node.classList.remove('selected')});
    node.classList.add('selected');
    node.focus();
    return false;
  } else if (event.button === 2 && event.target.classList.contains('node')) {
    event.preventDefault();
    var link = createLink();
    link.from = event.target;
    handleMouseDrag(event, {
      mousemove: function(cursor) {
        layoutLink(link, {x: cursor.position.x, y: cursor.position.y});
      },
      mouseup: function(event) {
        if (!(link.from && link.via && link.to)) {
          link.remove();
        }
        window.removeEventListener('mouseover', handleMouseover);
      }
    });
    function handleMouseover(event) {
      if (event.target.classList.contains('node') && !event.target.classList.contains('hidden') &&
        event.target !== link.via && event.target !== link.to && event.target !== link.from) {
        if (!link.via) {
          link.via = event.target;
        } else if (!link.to) {
          link.to = event.target;
          window.removeEventListener('mouseover', handleMouseover);
          layoutLink(link);
          link.from.links.add(link);
          link.via.links.add(link);
          link.to.links.add(link);
        }
      }
    }
    window.addEventListener('mouseover', handleMouseover);
    return false;
  } else if (event.button === 0 && event.target.classList.contains('node')) {
    handleNodeMousedown(event);
  } else if (event.button === 0 && event.target.classList.contains('link')) {
    event.preventDefault();
    if (!event.shiftKey) {
      Array.from(document.getElementsByClassName('selected')).forEach(element => {element.classList.remove('selected')});
    }
    if (event.shiftKey) {
      event.target.classList.toggle('selected');
    } else {
      event.target.classList.add('selected');
    }
    return false;
  } else if (event.button === 0 && event.target.tagName === 'TABLE') {
    event.preventDefault();
    var table = event.target;
    handleMouseDrag(event, {
      mousemove: function (cursor) {
        table.style.left = (parseFloat(table.style.left) + cursor.delta.x) + 'px';
        table.style.top  = (parseFloat(table.style.top)  + cursor.delta.y) + 'px';
        var affectedLinks = new Set();
        Array.from(table.getElementsByTagName('TD')).forEach(td => {
          td.attachedNodes.forEach(node => {
            node.style.left = (parseFloat(node.style.left) + cursor.delta.x) + 'px';
            node.style.top  = (parseFloat(node.style.top)  + cursor.delta.y) + 'px';
            node.links.forEach(link => affectedLinks.add(link));
          });
        });
        affectedLinks.forEach(layoutLink);
      },
    });
    return false;
  } else if (event.button === 1) {
    event.preventDefault();
    handleMouseDrag(event, {
      mousemove: function(cursor) {
        window.scrollBy(-cursor.deltaScreen.x, -cursor.deltaScreen.y);
      }
    });
    return false;
  } else {
    handleBackgroundMousedownForSelectionBox(event);
  }
});

graph.addEventListener('mouseover', event => {
  if (event.target.classList.contains('node')) {
    event.target.instances.forEach(node => node.classList.add('highlighted'));
  }
});

graph.addEventListener('mouseout', event => {
  if (event.target.classList.contains('node')) {
    event.target.instances.forEach(node => node.classList.remove('highlighted'));
  }
});

function saveState() {
  var id = 0;
  Array.from(document.getElementsByClassName('node')).forEach(node => {
    node.id = id;
    id = id + 1;
  });
  Array.from(document.getElementsByClassName('link')).forEach(link => {
    link.id = id;
    id = id + 1;
    link.setAttribute('data-from', link.from.id);
    link.setAttribute('data-via',  link.via.id);
    link.setAttribute('data-to',   link.to.id);
  });
  Array.from(document.getElementsByClassName('node')).forEach(node => {
    node.setAttribute('data-links', Array.from(node.links).map(function(link) {
      return link.id;
    }).join(','));
    node.setAttribute('data-instances', Array.from(node.instances).map(node => node.id).join(','));
  });
  localStorage.saved_state = document.getElementById('graph').innerHTML;
}

function restoreState() {
  document.getElementById('graph').innerHTML = localStorage.saved_state;
  Array.from(document.getElementsByClassName('link')).forEach(link => {
    link.from = document.getElementById(link.getAttribute('data-from'));
    link.via  = document.getElementById(link.getAttribute('data-via'));
    link.to   = document.getElementById(link.getAttribute('data-to'));
    link.removeAttribute('data-from');
    link.removeAttribute('data-via');
    link.removeAttribute('data-to');
  });
  Array.from(document.getElementsByClassName('node')).forEach(node => {
    if (node.getAttribute('data-links')) {
      node.links = new Set(node.getAttribute('data-links').split(',').map(id => document.getElementById(id)));
      node.removeAttribute('data-links');
    } else {
      node.links = new Set();
    }
    if (node.getAttribute('data-instances')) {
      node.instances = new Set(node.getAttribute('data-instances').split(',').map(id => document.getElementById(id)));
      node.removeAttribute('data-instances')
    } else {
      node.instances = new Set([node]);
    }
    node.setAttribute('tabindex', '-1');
  });
  Array.from(document.getElementsByClassName('node')).forEach(node => node.removeAttribute('id'));
  Array.from(document.getElementsByClassName('link')).forEach(link => link.removeAttribute('id'));
}
