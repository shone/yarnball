var layers = document.getElementById('layers');

if (localStorage.saved_state) {
  restoreState();
}

var mainPanel = document.getElementById('main-panel');
var findPanel = document.getElementById('find-panel');
var currentPanel = mainPanel;
var currentLayer = mainPanel.getElementsByClassName('layer')[0];
var currentSurface = currentLayer;
var layerSelector = document.getElementById('layer-selector');
var newLayerButton = document.getElementById('new-layer-button');

var cursor = document.createElement('div');
cursor.id = 'cursor';
cursor.style.left = '32px';
cursor.style.top  = '32px';
cursor.classList.add('blinking');
currentSurface.appendChild(cursor);

function resetCursorBlink() {
  cursor.classList.remove('blinking');
  cursor.offsetHeight;
  cursor.classList.add('blinking');
}

function getNodeUnderCursor() {
  var cursorX = parseInt(cursor.style.left);
  var cursorY = parseInt(cursor.style.top);
  return Array.from(currentSurface.getElementsByClassName('node')).find(node => {
    var nodeX = parseInt(node.style.left);
    var nodeY = parseInt(node.style.top);
    return (nodeX >= cursorX) && (nodeX < (cursorX + 64)) &&
           (nodeY >= cursorY) && (nodeY < (cursorY + 64));
  });
}

function createLayer() {
  var layerTab = document.createElement('input');
  layerTab.classList.add('layer-tab');
  layerSelector.insertBefore(layerTab, newLayerButton);
  var layer = document.createElement('div');
  layer.classList.add('layer');
  layer.classList.add('surface');
  layer.innerHTML = '<div class="nodes"></div><svg class="links"></svg>';
  layers.appendChild(layer);
  layerTab.focus();
  return layer;
}

newLayerButton.addEventListener('click', event => {
  var layer = createLayer();
  setCurrentLayer(layers.children.length - 1);
});

layerSelector.addEventListener('click', event => {
  if (event.target.classList.contains('layer-tab')) {
    var layerIndex = Array.from(layerSelector.getElementsByClassName('layer-tab')).indexOf(event.target);
    setCurrentLayer(layerIndex);
  }
});

function setCurrentLayer(index) {
  if (Array.from(layers).indexOf(currentLayer) !== index) {
    Array.from(currentLayer.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
    Array.from(layerSelector.children).forEach((layer, i) => layer.classList.toggle('current', i === index));
    Array.from(layers.children).forEach(       (layer, i) => layer.classList.toggle('current', i === index));
    currentLayer = layers.children[index];
  }
}

function pxToGrid(px) {
  return Math.round(px / 64) * 64;
}

var cursorPositionOnMouseDragStart = null;
var cursorPositionOffsetOnMouseDragStart = null;
var cursorPositionOnLastDragMousemove = null;
var cursorScreenPositionOnLastDragMousemove = null;
function handleMouseDrag(event, options) {
  function handleMousemove(event) {
    if (options.mousemove) {
      var position = {x: event.pageX, y: event.pageY};
      var positionOffset = {x: event.offsetX, y: event.offsetY};
      var positionScreen = {x: event.screenX, y: event.screenY};
      var delta = {x: position.x - cursorPositionOnLastDragMousemove.x, y: position.y - cursorPositionOnLastDragMousemove.y};
      var deltaTotal = {x: position.x - cursorPositionOnMouseDragStart.x, y: position.y - cursorPositionOnMouseDragStart.y};
      var deltaScreen = {x: positionScreen.x - cursorScreenPositionOnLastDragMousemove.x, y: positionScreen.y - cursorScreenPositionOnLastDragMousemove.y};
      cursorPositionOnLastDragMousemove = position;
      cursorScreenPositionOnLastDragMousemove = positionScreen;
      options.mousemove({position: position, positionOffset: positionOffset, delta: delta, deltaTotal: deltaTotal, deltaScreen: deltaScreen});
    }
  }
  function handleMouseup(event) {
    window.removeEventListener('mousemove', handleMousemove);
    window.removeEventListener('mouseup',   handleMouseup);
    if (options.mouseup) {
      options.mouseup(event);
    }
  }
  cursorPositionOnMouseDragStart = {x: event.pageX, y: event.pageY};
  cursorPositionOffsetOnMouseDragStart = {x: event.offsetX, y: event.offsetY};
  cursorPositionOnLastDragMousemove = cursorPositionOnMouseDragStart;
  cursorScreenPositionOnLastDragMousemove = {x: event.screenX, y: event.screenY};
  window.addEventListener('mousemove', handleMousemove);
  window.addEventListener('mouseup',   handleMouseup);
}

function findLinkVia(node, via) {
  for (var instance of node.instances) {
    var link = Array.from(instance.links).find(link => link.from.instances.has(node) && (link.via.value === via || link.via.instances.has(via)));
    if (link) return link;
  }
  return null;
}

function findNodeVia(node, via) {
  var link = findLinkVia(node, via);
  return link ? link.to : null;
}

function followListLinks(node, forward) {
  var links = [];
  var alreadyVisited = new Set();
  do {
    alreadyVisited.add(node);
    var forwardLink = Array.from(node.links).find(link => link.from === node && (link.via.value === forward || link.via.instances.has(forward)));
    if (forwardLink) {
      if (alreadyVisited.has(forwardLink.to)) {
        throw 'Attempting to follow list that forms a loop.';
      }
      links.push(forwardLink);
    }
    node = forwardLink ? forwardLink.to : null;
  } while(node)
  return links;
}

function followListNodes(node, forward) {
  var nodes = [];
  var alreadyVisited = new Set();
  do {
    if (alreadyVisited.has(node)) break;
    nodes.push(node);
    alreadyVisited.add(node);
    node = findNodeVia(node, forward) || null;
  } while(node)
  return nodes;
}

function createNode(options) {
  var node = document.createElement('input');
  node.classList.add('node');
  if (options && options.text) node.value = text;
  if (options && options.position) {
    node.style.left = String(options.position.x) + 'px';
    node.style.top  = String(options.position.y) + 'px';
  } else {
    node.style.left = '0px';
    node.style.top  = '0px';
  }
  node.instances = new Set([node]);
  node.links = new Set();
  if (options && options.parent) {
    options.parent.appendChild(node);
  } else {
    currentSurface.getElementsByClassName('nodes')[0].appendChild(node);
  }
  return node;
}

function instanceNode(sourceNode, position) {
  var node = document.createElement('input');
  node.classList.add('node');
  node.value = sourceNode.value;
  if (position) {
    node.style.left = String(position.x) + 'px';
    node.style.top  = String(position.y) + 'px';
  } else {
    node.style.left = '0px';
    node.style.top  = '0px';
  }
  sourceNode.instances.add(node);
  node.instances = sourceNode.instances;
  node.links = new Set();
  currentSurface.getElementsByClassName('nodes')[0].appendChild(node);
  return node;
}

function createLink(options) {
  var link = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  link.classList.add('link');
  currentSurface.getElementsByClassName('links')[0].appendChild(link);
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

function deleteElements(elements) {
  var affectedLinks = new Set();
  elements.forEach(element => {
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
}

var isDraggingNodes = false;

function handleNodeMousedown(event) {
  if (event.button === 0) {
    event.preventDefault();
    event.target.focus();
    currentSurface = event.target.closest('.surface');
    currentSurface.appendChild(cursor);
    cursor.style.left = (pxToGrid(parseInt(event.target.style.left)) - 32) + 'px';
    cursor.style.top  = (pxToGrid(parseInt(event.target.style.top))  - 32) + 'px';
    resetCursorBlink();
    if (event.shiftKey) {
      event.target.classList.toggle('selected');
    } else {
      if (!event.target.classList.contains('selected')) {
        Array.from(currentSurface.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
      }
    }
    // Node dragging
    var nodesToDrag = new Set(currentSurface.querySelectorAll('.node.selected'));
    nodesToDrag.add(document.activeElement);
    nodesToDrag.forEach(node => node.classList.add('dragging'));
    var cursorStartPosition = {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
    var nodeStartPositions = new Map();
    nodesToDrag.forEach(node => nodeStartPositions.set(node, {x: parseInt(node.style.left), y: parseInt(node.style.top)}));
    isDraggingNodes = true;
    handleMouseDrag(event, {
      mousemove: function(mouse) {
        var affectedLinks = new Set();
        nodesToDrag.forEach(node => {
          var startPosition = nodeStartPositions.get(node);
          node.style.left = (startPosition.x + pxToGrid(mouse.deltaTotal.x)) + 'px';
          node.style.top  = (startPosition.y + pxToGrid(mouse.deltaTotal.y)) + 'px';
          node.links.forEach(link => affectedLinks.add(link));
        });
        affectedLinks.forEach(link => {
          layoutLink(link);
        });
        cursor.style.left = (cursorStartPosition.x + pxToGrid(mouse.deltaTotal.x)) + 'px';
        cursor.style.top  = (cursorStartPosition.y + pxToGrid(mouse.deltaTotal.y)) + 'px';
        resetCursorBlink();
      },
      mouseup: function() {
        nodesToDrag.forEach(element => element.classList.remove('dragging'));
        isDraggingNodes = false;
      }
    });
    return false;
  }
}

layers.addEventListener('dblclick', (event) => {
  if (event.target.classList.contains('node')) {
    event.target.instances.forEach(node => node.classList.add('selected'));
  } else if (event.target.classList.contains('link')) {
    var connectedLinks = new Set([event.target]);
    var connectedNodes = new Set([event.target.from, event.target.via, event.target.to]);
    getAllConnectedNodesAndLinks(event.target.to, connectedNodes, connectedLinks);
    connectedNodes.delete(event.target.from);
    connectedNodes.forEach(node => node.classList.add('selected'));
  }
});

function getClosestNodeTo(position, nodes) {
  nodes = nodes || Array.from(currentSurface.getElementsByClassName('node'));
  var closestNode = null;
  var closestNodeDistance = null;
  for (var node of nodes) {
    var nodePosition = {x: parseInt(node.style.left), y: parseInt(node.style.top)};
    var delta = {x: position.x - nodePosition.x, y: position.y - nodePosition.y};
    var distance = (delta.x * delta.x) + (delta.y * delta.y);
    if (!closestNode || distance < closestNodeDistance) {
      closestNode = node;
      closestNodeDistance = distance;
    }
  }
  return closestNode;
}

function directionBetweenPoints(a, b) {
  var delta = {
    x: b.x - a.x,
    y: b.y - a.y,
  }
  var downLeft  = (-delta.x + delta.y) > 0;
  var downRight = ( delta.x + delta.y) > 0;
  if ( downLeft &&  downRight) return 'down';
  if (!downLeft && !downRight) return 'up';
  if ( downLeft && !downRight) return 'left';
  if (!downLeft &&  downRight) return 'right';
}

function getClosestNodeInDirection(sourceNode, direction) {
  var sourcePosition = {x: parseInt(sourceNode.style.left), y: parseInt(sourceNode.style.top)};
  if (direction === 'up')    sourcePosition.y += 1;
  if (direction === 'down')  sourcePosition.y -= 1;
  if (direction === 'left')  sourcePosition.x += 1;
  if (direction === 'right') sourcePosition.x -= 1;
  var closestNode = null;
  var distanceToClosestNode = null;
  Array.from(currentSurface.getElementsByClassName('node')).forEach(node => {
    if (node === sourceNode) return;
    var nodePosition = {x: parseInt(node.style.left), y: parseInt(node.style.top)};
    if (directionBetweenPoints(sourcePosition, nodePosition) === direction) {
      var deltaX = sourcePosition.x - nodePosition.x;
      var deltaY = sourcePosition.y - nodePosition.y;
      var distance = (deltaX * deltaX) + (deltaY * deltaY);
      if (closestNode === null || distance < distanceToClosestNode) {
        closestNode = node;
        distanceToClosestNode = distance;
      }
    }
  });
  return closestNode;
}

// Selection box
var selectionBox = null;
var selectionBoxPosition = {left: 0, top: 0, right: 0, bottom: 0};
function updateSelectionBox() {
  selectionBox.style.left   =  selectionBoxPosition.left   + 'px';
  selectionBox.style.top    =  selectionBoxPosition.top    + 'px';
  selectionBox.style.width  = (selectionBoxPosition.right  - selectionBoxPosition.left) + 'px';
  selectionBox.style.height = (selectionBoxPosition.bottom - selectionBoxPosition.top)  + 'px';
}
var selectedNodesToPreserve = null;
function handleBackgroundMousedownForSelectionBox(event) {
  event.preventDefault();
  selectionBox = document.getElementById('selection-box');
  if (!selectionBox) {
    selectionBox = document.createElement('div');
    selectionBox.id = 'selection-box';
  }
  currentSurface.appendChild(selectionBox);
  currentSurface.classList.add('dragging-selection-box');
  if (!event.shiftKey) {
    Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
    if (document.activeElement) document.activeElement.blur();
  } else {
    selectedNodesToPreserve = new Set(Array.from(document.getElementsByClassName('selected')));
  }
  handleMouseDrag(event, {
    mousemove: function(cursor) {
      selectionBoxPosition.left   = Math.min(cursorPositionOffsetOnMouseDragStart.x, cursor.positionOffset.x);
      selectionBoxPosition.top    = Math.min(cursorPositionOffsetOnMouseDragStart.y, cursor.positionOffset.y);
      selectionBoxPosition.right  = Math.max(cursorPositionOffsetOnMouseDragStart.x, cursor.positionOffset.x);
      selectionBoxPosition.bottom = Math.max(cursorPositionOffsetOnMouseDragStart.y, cursor.positionOffset.y);
      updateSelectionBox();
      Array.from(currentSurface.getElementsByClassName('node')).forEach(node => {
        if (selectedNodesToPreserve && selectedNodesToPreserve.has(node)) return;
        var inSelectionBox = !(
          ((parseInt(node.style.left) + (node.offsetWidth  - 25)) < selectionBoxPosition.left)  ||
          ((parseInt(node.style.left) - 25)                       > selectionBoxPosition.right) ||
          ((parseInt(node.style.top)  + (node.offsetHeight - 25)) < selectionBoxPosition.top)   ||
          ((parseInt(node.style.top)  - 25)                       > selectionBoxPosition.bottom)
        );
        node.classList.toggle('selected', inSelectionBox);
      });
      var closestNode = getClosestNodeTo(cursor.position, Array.from(document.querySelectorAll('.node.selected')));
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
      currentSurface.classList.remove('dragging-selection-box');
      selectionBox.remove();
      selectionBox = null;
    }
  });
  selectionBoxPosition = {left: 0, top: 0, right: 0, bottom: 0};
  updateSelectionBox();
  return false;
}

document.body.addEventListener('mousedown', event => {
  if (event.target.classList.contains('surface')) {
    currentSurface = event.target;
    cursor.style.left = (pxToGrid(event.offsetX) - 32) + 'px';
    cursor.style.top  = (pxToGrid(event.offsetY) - 32) + 'px';
    resetCursorBlink();
    if (cursor.parentElement !== event.target) {
      event.target.appendChild(cursor);
    }
  }
});

document.addEventListener('input', event => {
  if (event.target.classList.contains('node')) {
    var node = event.target;
    node.setAttribute('value', node.value);
    var nodeWidth = (Math.ceil(((node.value.length * 9) + 5) / 64) * 64) - 14;
    node.style.width = nodeWidth + 'px';
    if (event.target.closest('#find-panel')) {
      doFind();
    }
  }
});

document.addEventListener('paste', event => {
  if (event.clipboardData.items.length === 1) {
    var item = event.clipboardData.items[0];
    if (item.kind === 'string') {
      item.getAsString(string => {
        var fragment = document.createRange().createContextualFragment(string);
        var nodes = Array.from(fragment.querySelectorAll('.node'));
        var links = Array.from(fragment.querySelectorAll('.link'));
        nodes.forEach(node => currentSurface.getElementsByClassName('nodes')[0].appendChild(node));
        links = links.map(link => {
          var copiedLink = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
          copiedLink.setAttribute('id', link.getAttribute('id'));
          copiedLink.setAttribute('class', link.getAttribute('class'));
          copiedLink.setAttribute('data-from', link.getAttribute('data-from'));
          copiedLink.setAttribute('data-via',  link.getAttribute('data-via'));
          copiedLink.setAttribute('data-to',   link.getAttribute('data-to'));
          currentSurface.getElementsByClassName('links')[0].appendChild(copiedLink)
          return copiedLink;
        });
        deserialize(nodes, links);
        clearSerialization(nodes, links);
        var leftmost = null;
        var topmost  = null;
        nodes.forEach(node => {
          if (leftmost === null || parseInt(node.style.left) < leftmost) leftmost = parseInt(node.style.left);
          if (topmost  === null || parseInt(node.style.top)  < topmost)  topmost  = parseInt(node.style.top);
        });
        var deltaX = pxToGrid(parseInt(cursor.style.left)) - leftmost;
        var deltaY = pxToGrid(parseInt(cursor.style.top))  - topmost;
        nodes.forEach(node => {
          node.style.left = (parseInt(node.style.left) + deltaX) + 'px';
          node.style.top  = (parseInt(node.style.top)  + deltaY) + 'px';
        });
        links.forEach(layoutLink);
      });
    }
  }
});

document.body.addEventListener('keydown', event => {

  if (event.ctrlKey && (event.key === 'c' || event.key === 'x')) {
    var selectedNodes = Array.from(currentSurface.querySelectorAll('.node.selected'));
    var selectedNodesSet = new Set(selectedNodes);
    var affectedLinks = new Set();
    selectedNodes.forEach(node => {
      node.links.forEach(link => {
        if (selectedNodesSet.has(link.from) && selectedNodesSet.has(link.via) && selectedNodesSet.has(link.to)) {
          affectedLinks.add(link);
        }
      });
    });
    if (selectedNodes.length > 0) {
      event.preventDefault();
      prepareForSerialization(selectedNodes, affectedLinks);
      var html = selectedNodes.map(node => node.outerHTML).join('');
      html += Array.from(affectedLinks).map(link => link.outerHTML).join('');
      clearSerialization(selectedNodes, affectedLinks);
      var previouslyFocusedElement = document.activeElement;
      var temporaryInput = document.createElement('input');
      temporaryInput.value = html;
      document.body.appendChild(temporaryInput);
      temporaryInput.select();
      document.execCommand('copy');
      temporaryInput.remove();
      if (event.key === 'x') {
        deleteElements(selectedNodes);
        if (currentSurface.id === 'find-panel') doFind();
      } else if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
      }
      return false;
    }
  }

  if (event.key === 'a' && event.ctrlKey) {
    event.preventDefault();
    Array.from(currentLayer.getElementsByClassName('node')).forEach(node => node.classList.add('selected'));
    return false;
  }

  if (event.key === 'PageUp' || event.key === 'PageDown') {
    event.preventDefault();
    var otherLayer = (event.key  === 'PageUp') ? currentLayer.nextElementSibling : currentLayer.previousElementSibling;
    if (!otherLayer && event.key === 'PageUp') {
      otherLayer = createLayer();
    }
    if (otherLayer) {
      var otherLayerNodes = otherLayer.getElementsByClassName('nodes')[0];
      var otherLayerLinks = otherLayer.getElementsByClassName('links')[0];
      var selectedNodes = Array.from(currentLayer.querySelectorAll('.node.selected'));
      var affectedLinks = new Set();
      selectedNodes.forEach(node => {
        node.links.forEach(link => affectedLinks.add(link));
        node.remove();
        otherLayerNodes.appendChild(node);
      });
      affectedLinks.forEach(link => {
        link.remove();
        otherLayerLinks.appendChild(link);
      });
      setCurrentLayer(Array.from(layers.children).indexOf(otherLayer));
    }
    return false;
  }

  if (event.key === 'Enter') {
    if (isDraggingNodes) return false;
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      var newNode = createNode({position: {x: parseInt(document.activeElement.style.left), y: parseInt(document.activeElement.style.top) + 64}});
      newNode.focus();
      if (!event.shiftKey) {
        Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
      }
      cursor.style.left = (pxToGrid(parseInt(newNode.style.left)) - 32) + 'px';
      cursor.style.top  = (pxToGrid(parseInt(newNode.style.top))  - 32) + 'px';
      resetCursorBlink();
    }
  } else if (event.key === 'Tab') {
    var selectedNodes = new Set(currentSurface.querySelectorAll('.node.selected'));
    if (selectedNodes.size === 3 && selectedNodes.has(document.activeElement)) {
      event.preventDefault();
      var nonFocusedNodes = selectedNodes;
      nonFocusedNodes.delete(document.activeElement);
      nonFocusedNodes = Array.from(nonFocusedNodes).sort((a, b) => {
        var fX = parseInt(document.activeElement.style.left);
        var fY = parseInt(document.activeElement.style.top);
        var aDeltaX = fX - parseInt(a.style.left);
        var aDeltaY = fY - parseInt(a.style.top);
        var bDeltaX = fX - parseInt(b.style.left);
        var bDeltaY = fY - parseInt(b.style.top);
        return (((aDeltaX*aDeltaX) + (aDeltaY*aDeltaY)) > ((bDeltaX*bDeltaX) + (bDeltaY*bDeltaY))) ? -1 : 1;
      });
      var from = nonFocusedNodes[0];
      var via = nonFocusedNodes[1]
      var to = document.activeElement;
      var link = Array.from(from.links).find(link => link.from === from && link.via === via && link.to === to);
      if (link) {
        deleteElements([link]);
      } else {
        link = createLink({from: nonFocusedNodes[0], via: nonFocusedNodes[1], to: document.activeElement});
        layoutLink(link);
      }
      if (currentSurface.id === 'find-panel') doFind();
      return false;
    }
  } else if (event.key === 'Delete') {
    if (isDraggingNodes) return false;
    var elementsToDelete = new Set(currentSurface.getElementsByClassName('selected'));
    if (document.activeElement && document.activeElement.classList.contains('node') && document.activeElement.closest('.surface') === currentSurface) {
      elementsToDelete.add(document.activeElement);
    }
    if (elementsToDelete.size > 0) {
      var focusedNodePosition = null;
      if (document.activeElement && document.activeElement.classList.contains('node')) {
        focusedNodePosition = {x: parseInt(document.activeElement.style.left), y: parseInt(document.activeElement.style.top)};
      }
      event.preventDefault();
      deleteElements(elementsToDelete);
      if (currentSurface.id === 'find-panel') doFind();
      if (focusedNodePosition) {
        var closestNode = getClosestNodeTo(focusedNodePosition, Array.from(currentSurface.getElementsByClassName('node')));
        if (closestNode) {
          closestNode.focus();
          cursor.style.left = (pxToGrid(parseInt(closestNode.style.left)) - 32) + 'px';
          cursor.style.top  = (pxToGrid(parseInt(closestNode.style.top))  - 32) + 'px';
        }
      }
      return false;
    }
  }

  var arrowKeyDirections = {
    ArrowLeft:  'left',
    ArrowRight: 'right',
    ArrowUp:    'up',
    ArrowDown:  'down',
  }
  if (event.key in arrowKeyDirections) {
    if (isDraggingNodes) return false;
    if (event.ctrlKey) {
      var affectedLinks = new Set();
      var nodesToMove = new Set(currentSurface.querySelectorAll('.node.selected'));
      if (document.activeElement && document.activeElement.classList.contains('node')) {
        nodesToMove.add(document.activeElement);
      }
      var moveDelta = null;
      if (event.key === 'ArrowLeft')  moveDelta = {x: -64, y:   0};
      if (event.key === 'ArrowRight') moveDelta = {x:  64, y:   0};
      if (event.key === 'ArrowUp')    moveDelta = {x:   0, y: -64};
      if (event.key === 'ArrowDown')  moveDelta = {x:   0, y:  64};
      cursor.style.left = (parseInt(cursor.style.left) + moveDelta.x) + 'px';
      cursor.style.top  = (parseInt(cursor.style.top)  + moveDelta.y) + 'px';
      resetCursorBlink();
      nodesToMove.forEach(node => {
        node.style.left = (parseInt(node.style.left) + moveDelta.x) + 'px';
        node.style.top  = (parseInt(node.style.top)  + moveDelta.y) + 'px';
        node.links.forEach(link => affectedLinks.add(link));
      });
      affectedLinks.forEach(layoutLink);
    } else {
//       if (document.activeElement && document.activeElement.classList.contains('node')) {
//         var node = getClosestNodeInDirection(document.activeElement, arrowKeyDirections[event.key]);
//         if (node) {
//           event.preventDefault();
//           node.focus();
//           if (!event.shiftKey) {
//             Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
//           }
//           node.classList.add('selected');
//           return false;
//         }
//       }
        event.preventDefault();
        var cursorX = parseInt(cursor.style.left);
        var cursorY = parseInt(cursor.style.top);
        if (event.key === 'ArrowRight') cursorX += 64;
        if (event.key === 'ArrowLeft')  cursorX -= 64;
        if (event.key === 'ArrowDown')  cursorY += 64;
        if (event.key === 'ArrowUp')    cursorY -= 64;
        resetCursorBlink();
        if ((cursorX < 0) || (cursorY < 0)) return false;
        if (event.shiftKey) {
          var previousNodeUnderCursor = getNodeUnderCursor();
          if (previousNodeUnderCursor) {
            previousNodeUnderCursor.classList.add('selected');
          }
        }
        cursor.style.left = cursorX + 'px';
        cursor.style.top  = cursorY + 'px';
        if (!event.shiftKey) {
          Array.from(currentSurface.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
        }
        var nodeUnderCursor = getNodeUnderCursor();
        if (nodeUnderCursor) {
          nodeUnderCursor.focus();
          nodeUnderCursor.select();
        } else if (document.activeElement && document.activeElement.classList.contains('node')) {
          document.activeElement.blur();
        }
        return false;
    }
  }

  if (event.key === 'f' && event.ctrlKey) {
    event.preventDefault();
    findPanel.classList.remove('hidden');
    currentSurface = findPanel;
    var findPanelNodes = findPanel.getElementsByClassName('nodes')[0];
    if (findPanelNodes.getElementsByClassName('node').length === 0) {
      var node = createNode({position: {x: 64, y: 64}, parent: findPanelNodes});
      node.focus();
    } else {
      findPanelNodes.getElementsByClassName('node')[0].focus();
    }
    findPanel.appendChild(cursor);
    cursor.style.left = '32px';
    cursor.style.top  = '32px';
    resetCursorBlink();
    return false;
  }

  if (event.key === 'Escape') {
    if (!findPanel.classList.contains('hidden')) {
      event.preventDefault();
      findPanel.classList.add('hidden');
      return false;
    }
  }

  if (event.key === 'F8') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      console.log(compileStatements(document.activeElement));
    }
    return false;
  } else if (event.key === 'F9') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      var compiledStatements = compileStatements(document.activeElement);
      var f = null;
      if (compiledStatements.indexOf('await') !== -1) {
        var AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        f = new AsyncFunction([], compiledStatements);
      } else {
        f = new Function([], compiledStatements);
      }
      var returnValue = f();
      if (typeof returnValue !== 'undefined') {
        if (typeof returnValue.then === 'function') {
          returnValue.then(promisedValue => {
            if (typeof promisedValue === 'object') {
              document.activeElement.classList.remove('selected');
              makeJsonGraph(promisedValue, {x: parseInt(document.activeElement.style.left), y: parseInt(document.activeElement.style.top)});
            }
          });
        } else if (typeof returnValue === 'object') {
          document.activeElement.classList.remove('selected');
          makeJsonGraph(returnValue, {x: parseInt(document.activeElement.style.left), y: parseInt(document.activeElement.style.top)});
        }
      }
    }
    return false;
  } else if (event.key === 'F10') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      console.log(compileHtml(document.activeElement));
    }
    return false;
  }
});

function doFind() {
  var findPanelNodes = Array.from(findPanel.getElementsByClassName('node'));
  if (findPanelNodes.length === 1 && findPanelNodes[0].value) {
    Array.from(layers.getElementsByClassName('node')).forEach(node => {
      var match = node.value && node.value === findPanelNodes[0].value;
      node.classList.toggle('selected',    match);
      node.classList.toggle('highlighted', match);
    });
  } else {
    var findPanelLinks = Array.from(findPanel.getElementsByClassName('link'));
    var foundNodes = null;
    findPanelLinks.forEach(findLink => {
      var currentFoundNodes = new Set();
      Array.from(layers.getElementsByClassName('link')).forEach(link => {
        var match = (!findLink.from.value || link.from.value === findLink.from.value) &&
                    (!findLink.via.value  || link.via.value  === findLink.via.value)  &&
                    (!findLink.to.value   || link.to.value   === findLink.to.value);
        if (match) {
          if (!findLink.from.value) currentFoundNodes.add(link.from);
          if (!findLink.via.value)  currentFoundNodes.add(link.via);
          if (!findLink.to.value)   currentFoundNodes.add(link.to);
        }
      });
      if (foundNodes === null) {
        foundNodes = currentFoundNodes;
      } else {
        foundNodes = new Set(Array.from(currentFoundNodes).filter(node => foundNodes.has(node)));
      }
    });
    Array.from(layers.getElementsByClassName('node')).forEach(node => {
      var found = foundNodes && foundNodes.has(node);
      node.classList.toggle('selected',    found)
      node.classList.toggle('highlighted', found)
    });
  }
}

function duplicateNodes(nodes) {
  var affectedLinks = new Set();
  var duplicatedNodesMap = new Map();
  nodes = new Set(nodes);
  nodes.forEach(node => {
    node.links.forEach(link => affectedLinks.add(link));
    var nodeInstance = createNode({position: {x: parseInt(node.style.left), y: parseInt(node.style.top) + 64}});
    nodeInstance.value = node.value;
    node.instances.add(nodeInstance);
    nodeInstance.instances = node.instances;
    node.classList.remove('selected');
    nodeInstance.classList.add('selected');
    nodeInstance.focus();
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
  if (event.key === ' ') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      event.preventDefault();
      var newNode = createNode({position: {x: parseInt(document.activeElement.style.left) + parseInt(document.activeElement.offsetWidth) + 14, y: parseInt(document.activeElement.style.top)}});
      document.activeElement.classList.remove('selected');
      Array.from(document.querySelectorAll('.link.selected')).forEach(link => link.classList.remove('selected'));
      newNode.focus();
      cursor.style.left = (pxToGrid(parseInt(newNode.style.left)) - 32) + 'px';
      cursor.style.top  = (pxToGrid(parseInt(newNode.style.top))  - 32) + 'px';
      resetCursorBlink();
      return false;
    }
//   } else if (event.key === 'd') {
//     var selectedNodes = Array.from(document.querySelectorAll('.node.selected'));
//     if (selectedNodes.length > 0) {
//       event.preventDefault();
//       duplicateNodes(selectedNodes);
//       return false;
//     }

//   } else if (event.key === 'h') {
//     if (document.activeElement && document.activeElement.classList.contains('node')) {
//       Array.from(document.getElementsByTagName('iframe')).forEach(iframe => iframe.remove());
//       var html = compileHtml(document.activeElement);
//       var iFrame = document.createElement('iframe');
//       iFrame.src = 'data:text/html;charset=utf-8,' + encodeURI(html);
//       document.body.appendChild(iFrame);
//     }
  } else if (event.key === 'S' && event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    saveState();
    return false;
  }

  if (!document.activeElement || document.activeElement.tagName !== 'INPUT') {
    var newNode = createNode({position: {x: pxToGrid(parseInt(cursor.style.left)), y: pxToGrid(parseInt(cursor.style.top))}});
    if (event.key === ' ') {
      event.preventDefault();
      cursor.style.left = (parseInt(cursor.style.left) + 64) + 'px';
      resetCursorBlink();
    } else {
      newNode.focus();
    }
    return false;
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
    return parseInt(node.style.left) + ',' + parseInt(node.style.top);
  }
  if (link.to) {
    link.setAttribute('points', [pos(link.from), pos(link.via), pos(link.to)].join(' '));
  } else if (link.via) {
    link.setAttribute('points', [pos(link.from), pos(link.via), lastPosition.x + ',' + lastPosition.y].join(' '));
  } else {
    link.setAttribute('points', [pos(link.from), lastPosition.x + ',' + lastPosition.y].join(' '));
  }
}

document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('mousedown', event => {
  if (event.button === 2 && event.target.classList.contains('node')) {
    event.preventDefault();
    var link = createLink();
    link.from = event.target;
    var fromPosition = {x: parseInt(link.from.style.left), y: parseInt(link.from.style.top)};
    handleMouseDrag(event, {
      mousemove: function(cursor) {
        layoutLink(link, {x: fromPosition.x + cursor.deltaTotal.x, y: fromPosition.y + cursor.deltaTotal.y});
      },
      mouseup: function(event) {
        if (!(link.from && link.via && link.to)) {
          link.remove();
        } else {
          if (link.closest('#find-panel')) {
            doFind();
          }
        }
        window.removeEventListener('mouseover', handleMouseover);
      }
    });
    function handleMouseover(event) {
      if (event.target.classList.contains('node') &&
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
  } else if (event.button === 1) {
    event.preventDefault();
    handleMouseDrag(event, {
      mousemove: cursor => {
        mainPanel.scrollBy(-cursor.deltaScreen.x, -cursor.deltaScreen.y);
      },
      mouseup: event => {
        event.preventDefault();
        return false;
      }
    });
    return false;
  } else if (event.target.classList.contains('surface')) {
    handleBackgroundMousedownForSelectionBox(event);
  }
});

// Node instance highlighting
layers.addEventListener('mouseover', event => {
  if (event.target.classList.contains('node')) {
    event.target.instances.forEach(node => node.classList.add('instance-highlighted'));
  }
});
layers.addEventListener('mouseout', event => {
  if (event.target.classList.contains('node')) {
    event.target.instances.forEach(node => node.classList.remove('instance-highlighted'));
  }
});

function prepareForSerialization(nodes, links) {
  var id = 0;
  var nodesSet = new Set(nodes);
  var linksSet = new Set(links);
  nodes.forEach(node => node.id = id++);
  links.forEach(link => link.id = id++);
  links.forEach(link => {
    link.setAttribute('data-from', link.from.id);
    link.setAttribute('data-via',  link.via.id);
    link.setAttribute('data-to',   link.to.id);
  });
  nodes.forEach(node => {
    node.setAttribute('data-links', Array.from(node.links).filter(link => linksSet.has(link)).map(link => link.id).join(','));
    node.setAttribute('data-instances', Array.from(node.instances).filter(node => nodesSet.has(node)).map(node => node.id).join(','));
  });
}

function deserialize(nodes, links) {
  links.forEach(link => {
    link.from = document.getElementById(link.getAttribute('data-from'));
    link.via  = document.getElementById(link.getAttribute('data-via'));
    link.to   = document.getElementById(link.getAttribute('data-to'));
  });
  nodes.forEach(node => {
    if (node.getAttribute('data-links')) {
      node.links = new Set(node.getAttribute('data-links').split(',').map(id => document.getElementById(id)));
      if (node.links.has(null)) {
        console.error('null link');
        node.links.delete(null);
      }
    } else {
      node.links = new Set();
    }
    if (node.getAttribute('data-instances')) {
      node.instances = new Set(node.getAttribute('data-instances').split(',').map(id => document.getElementById(id)));
      if (node.instances.has(null)) {
        console.error('null instance');
        node.instances.delete(null);
      }
    } else {
      node.instances = new Set([node]);
    }
    node.classList.remove('selected');
  });
}

function clearSerialization(nodes, links) {
  links.forEach(link => {
    link.removeAttribute('id');
    link.removeAttribute('data-from');
    link.removeAttribute('data-via');
    link.removeAttribute('data-to');
  });
  nodes.forEach(node => {
    node.removeAttribute('id');
    node.removeAttribute('data-links');
    node.removeAttribute('data-instances')
  });
}

function saveState() {
  prepareForSerialization(Array.from(document.getElementsByClassName('node')), Array.from(document.getElementsByClassName('link')));
  cursor.remove();
  localStorage.saved_state = layers.innerHTML;
  currentSurface.appendChild(cursor);
}

function restoreState() {
  layers.innerHTML = localStorage.saved_state;
  Array.from(document.getElementsByClassName('link')).forEach(link => {
    link.from = document.getElementById(link.getAttribute('data-from'));
    link.via  = document.getElementById(link.getAttribute('data-via'));
    link.to   = document.getElementById(link.getAttribute('data-to'));
  });
  Array.from(document.getElementsByClassName('node')).forEach(node => {
    if (node.getAttribute('data-links')) {
      node.links = new Set(node.getAttribute('data-links').split(',').map(id => document.getElementById(id)));
      if (node.links.has(null)) {
        console.error('null link');
        node.links.delete(null);
      }
    } else {
      node.links = new Set();
    }
    if (node.getAttribute('data-instances')) {
      node.instances = new Set(node.getAttribute('data-instances').split(',').map(id => document.getElementById(id)));
      if (node.instances.has(null)) {
        console.error('null instance');
        node.instances.delete(null);
      }
    } else {
      node.instances = new Set([node]);
    }
    node.classList.remove('selected');
  });
  clearSerialization(Array.from(document.getElementsByClassName('node')), Array.from(document.getElementsByClassName('link')));
}
