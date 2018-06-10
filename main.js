var mainSurface = document.getElementById('main-surface');
var currentSurface = mainSurface;

function setCurrentSurface(surface) {
  currentSurface.classList.remove('current');
  surface.classList.add('current');
  currentSurface = surface;
  cursor = currentSurface.getElementsByClassName('cursor')[0];
}

if (localStorage.saved_state) {
  restoreState();
}

document.getElementById('help-button').addEventListener('click', event => {
  document.getElementById('help-screen').classList.toggle('hidden');
  document.getElementById('help-button').classList.toggle('active');
});

var findPanel = document.getElementById('find-panel');

var cursor = currentSurface.getElementsByClassName('cursor')[0];
cursor.classList.add('blinking');

function setCursorPosition(x, y) {
  resetCursorBlink();
  if (parseInt(cursor.style.left) === x && parseInt(cursor.style.top) === y) return;
  cursor.style.left = x + 'px';
  cursor.style.top  = y + 'px';
  cursor.scrollIntoView({block: 'nearest', inline: 'nearest'});
  var nodeUnderCursor = getNodeUnderCursor();
  if (nodeUnderCursor) {
    nodeUnderCursor.select();
  }
}

function resetCursorBlink() {
  cursor.classList.remove('blinking');
  cursor.offsetHeight;
  cursor.classList.add('blinking');
}

function getNodeUnderCursor(surface) {
  surface = surface || currentSurface;
  var cursor_ = surface.getElementsByClassName('cursor')[0];
  var cursorX = parseInt(cursor_.style.left);
  var cursorY = parseInt(cursor_.style.top);
  return [...surface.getElementsByClassName('node')].find(node => {
    return (cursorY === parseInt(node.style.top) - 16) &&
           (cursorX >= parseInt(node.style.left) - 32) && (cursorX < parseInt(node.style.left) + parseInt(node.style.width) - 18);
  });
}

var pxToGridX = px => Math.round(px / 64) * 64;
var pxToGridY = px => Math.round(px / 32) * 32;

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
    var link = [...instance.links].find(link => link.from.instances.has(node) && (link.via.value === via || link.via.instances.has(via)));
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
    var forwardLink = [...node.links].find(link => link.from === node && (link.via.value === forward || link.via.instances.has(forward)));
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
  node.style.width = '50px';
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

var linkBeingCreated = null;
function useNodeForLinkCreationMode(node) {
  if (linkBeingCreated) {
    if (!linkBeingCreated.from) {
      linkBeingCreated.from = node;
      linkBeingCreated.from.links.add(linkBeingCreated);
    } else if (!linkBeingCreated.via) {
      if (linkBeingCreated.from === node) return;
      linkBeingCreated.via = node;
      linkBeingCreated.via.links.add(linkBeingCreated);
      layoutLink(linkBeingCreated, {x: parseInt(cursor.style.left) + 32, y: parseInt(cursor.style.top) + 32});
    } else if (!linkBeingCreated.to) {
      if (linkBeingCreated.from === node || linkBeingCreated.via === node) return;
      var existingLink = Array.from(currentSurface.getElementsByClassName('link')).find(link => {
        return link.from === linkBeingCreated.from &&
               link.via  === linkBeingCreated.via  &&
               link.to   === node;
      });
      if (existingLink) {
        deleteElements([existingLink]);
        linkBeingCreated.from.links.delete(linkBeingCreated);
        linkBeingCreated.via.links.delete(linkBeingCreated);
        linkBeingCreated.remove();
      } else {
        linkBeingCreated.to = node;
        linkBeingCreated.to.links.add(linkBeingCreated);
        layoutLink(linkBeingCreated);
        if (currentSurface.id === 'find-panel') highlightQueriedNodes();
      }
      linkBeingCreated = null;
      cursor.classList.remove('insert-mode');
      resetCursorBlink();
    }
  }
}
function executeLinkMode() {
  var selectedNodes = new Set(currentSurface.querySelectorAll('.node.selected'));
  if (selectedNodes.size === 3 && selectedNodes.has(document.activeElement)) {
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
  } else if (selectedNodes.size === 0) {
    if (!linkBeingCreated) {
      linkBeingCreated = createLink();
      if (document.activeElement && document.activeElement.classList.contains('node')) {
        useNodeForLinkCreationMode(document.activeElement);
      }
      cursor.classList.add('insert-mode');
      resetCursorBlink();
    } else {
      if (document.activeElement && document.activeElement.classList.contains('node')) {
        useNodeForLinkCreationMode(document.activeElement);
      } else {
        cancelLinkMode();
      }
    }
  }
}
function cancelLinkMode() {
  if (linkBeingCreated) {
    if (linkBeingCreated.from) linkBeingCreated.from.links.delete(linkBeingCreated);
    if (linkBeingCreated.via)  linkBeingCreated.via.links.delete(linkBeingCreated);
    if (linkBeingCreated.to)   linkBeingCreated.to.links.delete(linkBeingCreated);
    linkBeingCreated.remove();
    linkBeingCreated = null;
  }
  cursor.classList.remove('insert-mode');
  resetCursorBlink();
}

function deleteElements(elements) {
  var affectedLinks = new Set();
  elements.forEach(element => {
    if (element.classList.contains('node')) {
      element.instances.delete(element);
      for (link of element.links) affectedLinks.add(link);
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

function deleteSelection() {
  if (isDraggingNodes) return false;
  var elementsToDelete = new Set(currentSurface.getElementsByClassName('selected'));
  if (document.activeElement && document.activeElement.classList.contains('node') && document.activeElement.closest('.surface') === currentSurface) {
    elementsToDelete.add(document.activeElement);
  }
  if (elementsToDelete.size === 0) return false;
  var focusedNodePosition = null;
  if (document.activeElement && document.activeElement.classList.contains('node')) {
    focusedNodePosition = {x: parseInt(document.activeElement.style.left), y: parseInt(document.activeElement.style.top)};
  }
  deleteElements(elementsToDelete);
  if (currentSurface.id === 'find-panel') highlightQueriedNodes();
  if (focusedNodePosition) {
    var closestNode = getClosestNodeTo(focusedNodePosition, Array.from(currentSurface.getElementsByClassName('node')));
    if (closestNode) {
      setCursorPosition(
        pxToGridX(parseInt(closestNode.style.left)) - 32,
        pxToGridY(parseInt(closestNode.style.top))  - 16
      );
    }
  }
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
}

function cancelCurrentModeOrOperation() {
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
    for (selected of [...currentSurface.getElementsByClassName('selected')]) {
      selected.classList.remove('selected');
    }
    return;
  }
  if (linkBeingCreated || cursor.classList.contains('insert-mode')) {
    cancelLinkMode();
    return;
  }
  if (!findPanel.classList.contains('hidden')) {
    findPanel.classList.add('hidden');
    for (highlighted of [...mainSurface.getElementsByClassName('highlighted')]) {
      highlighted.classList.remove('highlighted');
    }
    setCurrentSurface(mainSurface);
    return;
  }
}

function selectionToClipboard(options) {
  options = options || {};
  var selectedNodes = [...currentSurface.querySelectorAll('.node.selected')];
  if (selectedNodes.length === 0) return;
  var selectedNodesSet = new Set(selectedNodes);
  var affectedLinks = new Set();
  for (node of selectedNodes) {
    for (link of node.links) {
      if (
        selectedNodesSet.has(link.from) &&
        selectedNodesSet.has(link.via)  &&
        selectedNodesSet.has(link.to)
      ) affectedLinks.add(link);
    }
  }
  prepareForSerialization(selectedNodes, affectedLinks);
  var html = selectedNodes.map(node => node.outerHTML).join('');
  html += [...affectedLinks].map(link => link.outerHTML).join('');
  clearSerialization(selectedNodes, affectedLinks);
  var previouslyFocusedElement = document.activeElement;
  var temporaryInput = document.createElement('input');
  temporaryInput.value = html;
  document.body.appendChild(temporaryInput);
  temporaryInput.select();
  document.execCommand('copy');
  temporaryInput.remove();
  if (options.cut) {
    deleteElements(selectedNodes);
    if (currentSurface.id === 'find-panel') highlightQueriedNodes();
  } else if (previouslyFocusedElement) {
    previouslyFocusedElement.focus();
  }
}

var isDraggingNodes = false;

function handleNodeMousedown(event) {
  if (event.button === 0) {
    event.preventDefault();
    event.target.focus();
    setCurrentSurface(event.target.closest('.surface'));
    cursor.style.left = (pxToGridX(parseInt(event.target.style.left)) - 32) + 'px';
    cursor.style.top  = (pxToGridY(parseInt(event.target.style.top))  - 16) + 'px';
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
          node.style.left = (startPosition.x + pxToGridX(mouse.deltaTotal.x)) + 'px';
          node.style.top  = (startPosition.y + pxToGridY(mouse.deltaTotal.y)) + 'px';
          node.links.forEach(link => affectedLinks.add(link));
        });
        affectedLinks.forEach(link => {
          layoutLink(link);
        });
        cursor.style.left = (cursorStartPosition.x + pxToGridX(mouse.deltaTotal.x)) + 'px';
        cursor.style.top  = (cursorStartPosition.y + pxToGridY(mouse.deltaTotal.y)) + 'px';
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

mainSurface.addEventListener('dblclick', (event) => {
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

function getAdjacentNodesInDirection(sourceNode, direction) {
  return [...currentSurface.getElementsByClassName('node')].filter(node => {
    if (node === sourceNode) return false;
    return (
      (direction === 'right' &&
       parseInt(node.style.top) === parseInt(sourceNode.style.top) &&
       parseInt(node.style.left) === parseInt(sourceNode.style.left) + parseInt(sourceNode.style.width) + 14)
      ||
      (direction === 'left' &&
        parseInt(node.style.top) === parseInt(sourceNode.style.top) &&
        parseInt(node.style.left) + parseInt(node.style.width) === parseInt(sourceNode.style.left) - 14)
      ||
      (direction === 'up' &&
        parseInt(node.style.top) === parseInt(sourceNode.style.top) - 32 &&
        !(parseInt(node.style.left) > parseInt(sourceNode.style.left) + parseInt(sourceNode.style.width) ||
          parseInt(node.style.left) + parseInt(node.style.width) < parseInt(sourceNode.style.left)))
      ||
      (direction === 'down' &&
        parseInt(node.style.top) === parseInt(sourceNode.style.top) + 32 &&
        !(parseInt(node.style.left) > parseInt(sourceNode.style.left) + parseInt(sourceNode.style.width) ||
          parseInt(node.style.left) + parseInt(node.style.width) < parseInt(sourceNode.style.left)))
    );
  });
}

function getAllAdjacentNodesInDirection(sourceNodes, direction) {
  var adjacentNodes = [];
  var currentSet = [...sourceNodes];
  do {
    var newSet = new Set();
    for (node of currentSet) {
      getAdjacentNodesInDirection(node, direction).forEach(n => newSet.add(n));
    }
    newSet.forEach(n => adjacentNodes.push(n));
    currentSet = [...newSet];
  } while(currentSet.length !== 0)
  return adjacentNodes;
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
    setCurrentSurface(event.target);
    setCursorPosition(
      pxToGridX(event.offsetX) - 32,
      pxToGridY(event.offsetY) - 16
    );
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
      highlightQueriedNodes();
    }
  }
});

document.addEventListener('paste', event => {
  if (event.clipboardData.items.length !== 1) return;
  var item = event.clipboardData.items[0];
  if (item.kind !== 'string') return;
  item.getAsString(string => {
    var fragment = document.createRange().createContextualFragment(string);
    var nodes = [...fragment.querySelectorAll('.node')];
    var links = [...fragment.querySelectorAll('.link')];
    for (node of nodes) currentSurface.getElementsByClassName('nodes')[0].appendChild(node);
    links = links.map(link => {
      var copiedLink = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      copiedLink.setAttribute('id',        link.getAttribute('id'));
      copiedLink.setAttribute('class',     link.getAttribute('class'));
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
    for (node of nodes) {
      if (leftmost === null || parseInt(node.style.left) < leftmost) leftmost = parseInt(node.style.left);
      if (topmost  === null || parseInt(node.style.top)  < topmost)  topmost  = parseInt(node.style.top);
    }
    var deltaX = pxToGridX(parseInt(cursor.style.left)) - leftmost;
    var deltaY = pxToGridY(parseInt(cursor.style.top))  - topmost;
    for (node of nodes) {
      node.style.left = (parseInt(node.style.left) + deltaX) + 'px';
      node.style.top  = (parseInt(node.style.top)  + deltaY) + 'px';
    }
    links.forEach(layoutLink);
  });
});

function getConnectedLinks(link) {
  var surface = link.closest('.surface');
  var nodesAlreadySeen = new Set([link.from, link.via, link.to]);
  var linksAlreadySeen = new Set([link]);
  var allLinks = Array.from(surface.getElementsByClassName('link')).filter(link => link.from && link.via && link.to);
  var connectedLinks = [];
  var connectedLink = null;
  do {
    connectedLink = allLinks.find(link => {
      if (linksAlreadySeen.has(link)) return false;
      return nodesAlreadySeen.has(link.from) ||
             nodesAlreadySeen.has(link.via) ||
             nodesAlreadySeen.has(link.to);
    });
    if (connectedLink) {
      connectedLinks.push(connectedLink);
      linksAlreadySeen.add(connectedLink);
      nodesAlreadySeen.add(connectedLink.from);
      nodesAlreadySeen.add(connectedLink.via);
      nodesAlreadySeen.add(connectedLink.to);
    }
  } while(connectedLink);
  return connectedLinks;
}

function testNodesFindMatch(findNode, targetNode) {
  return !findNode.value ||
         findNode.value === '*' ||
         targetNode.value === findNode.value ||
         (findNode.value === '$' && (targetNode.classList.contains('selected') || (targetNode === getNodeUnderCursor(mainSurface))));
}

function getQueriedNodes() {
  var findPanelNodes = Array.from(findPanel.getElementsByClassName('node'));
  if (findPanelNodes.length === 1) {
    if (findPanelNodes[0].value) {
      return new Set([...mainSurface.getElementsByClassName('node')].filter(node => {
        return node.value && node.value === findPanelNodes[0].value;
      }));
    } else {
      return new Set();
    }
  } else {
    var findPanelLinks = [...findPanel.getElementsByClassName('link')].filter(link => link.from && link.via && link.to);
    if (findPanelLinks.length === 0) return new Set();

    var findLink = findPanelLinks[0];
    var correspondences = [];
    for (link of mainSurface.getElementsByClassName('link')) {
      var match = testNodesFindMatch(findLink.from, link.from) &&
                  testNodesFindMatch(findLink.via,  link.via)  &&
                  testNodesFindMatch(findLink.to,   link.to);
      if (match) {
        var correspondence = new Map();
        correspondence.set(link.from, findLink.from);
        correspondence.set(link.via,  findLink.via);
        correspondence.set(link.to,   findLink.to);
        correspondences.push(correspondence);
      }
    }
    var connectedLinks = getConnectedLinks(findLink);
    for (connectedLink of connectedLinks) {
      correspondences = correspondences.filter(correspondence => {
        var hasMatchingLink = false;
        for (link of mainSurface.getElementsByClassName('link')) {
          var match = ((correspondence.get(link.from) === connectedLink.from) ||
                       (correspondence.get(link.via)  === connectedLink.via)  ||
                       (correspondence.get(link.to)   === connectedLink.to))  &&
                      testNodesFindMatch(connectedLink.from, link.from) &&
                      testNodesFindMatch(connectedLink.via,  link.via)  &&
                      testNodesFindMatch(connectedLink.to,   link.to);
          if (match) {
            hasMatchingLink = true;
            correspondence.set(link.from, connectedLink.from);
            correspondence.set(link.via,  connectedLink.via);
            correspondence.set(link.to,   connectedLink.to);
          }
        }
        return hasMatchingLink;
      });
    }
    var queryResult = new Set();
    for (correspondence of correspondences) {
      correspondence.forEach((queryNode, targetNode) => {
        if (queryNode.value === '*') {
          queryResult.add(targetNode);
        }
      });
    }
    return queryResult;
  }
}

function openFindPanel() {
  findPanel.classList.remove('hidden');
  setCurrentSurface(findPanel);
  var findPanelNodes = findPanel.getElementsByClassName('nodes')[0];
  if (findPanelNodes.getElementsByClassName('node').length === 0) {
    createNode({position: {x: 64, y: 32}, parent: findPanelNodes});
  } else {
    highlightQueriedNodes();
  }
  resetCursorBlink();
  var nodeUnderCursor = getNodeUnderCursor();
  if (nodeUnderCursor) {
    nodeUnderCursor.focus();
  }
}

function highlightQueriedNodes() {
  var queriedNodes = getQueriedNodes();
  for (node of mainSurface.getElementsByClassName('node')) {
    node.classList.toggle('highlighted', queriedNodes.has(node));
  }
}

function moveSelectionToQueriedNodes() {
  var queriedNodes = getQueriedNodes();
  for (node of mainSurface.getElementsByClassName('node')) {
    node.classList.toggle('highlighted', queriedNodes.has(node));
    node.classList.toggle('selected',    queriedNodes.has(node) || (event.shiftKey && node.classList.contains('selected')));
  }
  if (queriedNodes.size > 0) {
    setCurrentSurface(mainSurface);
    setCursorPosition(
      parseInt([...queriedNodes][0].style.left) - 32,
      parseInt([...queriedNodes][0].style.top)  - 16
    );
  }
}

function moveSelectionInDirection(direction) {
  resetCursorBlink();
  var nodesToMove = new Set(currentSurface.querySelectorAll('.node.selected'));
  var nodeUnderCursor = getNodeUnderCursor();
  if (nodeUnderCursor) {
    nodesToMove.add(nodeUnderCursor);
  }
  if (nodesToMove.size === 0) return;

  var affectedLinks = new Set();
  var adjacentNodes = getAllAdjacentNodesInDirection(nodesToMove, direction);
  adjacentNodes.forEach(node => nodesToMove.add(node));
  var moveDelta = {
    left:  {x: -64, y:   0},
    right: {x:  64, y:   0},
    up:    {x:   0, y: -32},
    down:  {x:   0, y:  32},
  }[direction];
  var willNodeBeMovedOutOfBounds = [...nodesToMove].find(node => {
    return parseInt(node.style.left) + moveDelta.x < 64 ||
           parseInt(node.style.top)  + moveDelta.y < 32;
  });
  if (willNodeBeMovedOutOfBounds) return false;

  for (node of nodesToMove) {
    node.style.left = (parseInt(node.style.left) + moveDelta.x) + 'px';
    node.style.top  = (parseInt(node.style.top)  + moveDelta.y) + 'px';
    node.links.forEach(link => affectedLinks.add(link));
  }
  affectedLinks.forEach(link => layoutLink(link));

  cursor.style.left = (parseInt(cursor.style.left) + moveDelta.x) + 'px';
  cursor.style.top  = (parseInt(cursor.style.top)  + moveDelta.y) + 'px';

  if (selectionBox) {
    selectionBox.style.left = (parseInt(selectionBox.style.left) + moveDelta.x) + 'px';
    selectionBox.style.top  = (parseInt(selectionBox.style.top)  + moveDelta.y) + 'px';
  }
}

function insertNodeAtCursor(options) {
  var offsetX = 0;
  var offsetY = 0;

  if (document.activeElement && document.activeElement.classList.contains('node')) {
    offsetX = {left: -64, right: parseInt(document.activeElement.offsetWidth) + 14}[options.moveAdjacent] || 0;
    offsetY = {down: 32, up: -32}[options.moveAdjacent] || 0;
    var adjacentNodes = getAllAdjacentNodesInDirection([document.activeElement], options.moveAdjacent);
    var affectedLinks = new Set();
    for (node of adjacentNodes) {
      node.style.left = (parseInt(node.style.left) + offsetX) + 'px';
      node.style.top  = (parseInt(node.style.top)  + offsetY) + 'px';
      for (link of node.links) affectedLinks.add(link);
    }
    for (link of affectedLinks) layoutLink(link);
  }

  var newNode = createNode({
    position: {
      x: pxToGridX(parseInt(cursor.style.left) + offsetX),
      y: pxToGridY(parseInt(cursor.style.top)  + offsetY),
    }
  });
  newNode.focus();
  setCursorPosition(
    pxToGridX(parseInt(newNode.style.left)) - 32,
    pxToGridY(parseInt(newNode.style.top))  - 16
  );
  Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
  if (linkBeingCreated) useNodeForLinkCreationMode(newNode);
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

function moveCursorInDirection(direction, options) {
  options = options || {};
  var moveDelta = {
    left:  {x: -64, y:   0},
    right: {x:  64, y:   0},
    up:    {x:   0, y: -32},
    down:  {x:   0, y:  32},
  }[direction];
  var cursorX = parseInt(cursor.style.left) + moveDelta.x;
  var cursorY = parseInt(cursor.style.top)  + moveDelta.y;
  if (cursorX <= 0 || cursorY <= 0) {
    window.scroll({
      left: cursorX <= 0 ? 0 : undefined,
      top:  cursorY <= 0 ? 0 : undefined,
    });
  }
  if ((cursorX < 0) || (cursorY < 0)) return;
  if (options.dragSelectionBox) {
    if (!selectionBox) {
      selectionBox = document.createElement('div');
      selectionBox.id = 'selection-box';
      currentSurface.appendChild(selectionBox);
      selectionBox.anchorPosition = {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
    }
    var selectionBoxLeft   = Math.min(selectionBox.anchorPosition.x, cursorX);
    var selectionBoxTop    = Math.min(selectionBox.anchorPosition.y, cursorY);
    var selectionBoxWidth  = Math.max(64, Math.abs(selectionBox.anchorPosition.x - cursorX));
    var selectionBoxHeight = Math.max(32, Math.abs(selectionBox.anchorPosition.y - cursorY));
    var selectionBoxRight  = selectionBoxLeft + selectionBoxWidth;
    var selectionBoxBottom = selectionBoxTop  + selectionBoxHeight;
    selectionBox.style.left   = selectionBoxLeft   + 'px';
    selectionBox.style.top    = selectionBoxTop    + 'px';
    selectionBox.style.width  = selectionBoxWidth  + 'px';
    selectionBox.style.height = selectionBoxHeight + 'px';
    for (node of currentSurface.getElementsByClassName('node')) {
      var nodeX = parseInt(node.style.left);
      var nodeY = parseInt(node.style.top);
      node.classList.toggle('selected', nodeX > selectionBoxLeft && nodeX < selectionBoxRight &&
                                        nodeY > selectionBoxTop  && nodeY < selectionBoxBottom);
    }
  } else if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
  if (linkBeingCreated) {
    layoutLink(linkBeingCreated, {x: cursorX + 32, y: cursorY + 16});
  }
  if (!options.dragSelectionBox) {
    for (element of [...currentSurface.getElementsByClassName('selected')]) {element.classList.remove('selected')}
  }
  setCursorPosition(cursorX, cursorY);
  var nodeUnderCursor = getNodeUnderCursor();
  if (nodeUnderCursor) {
    nodeUnderCursor.focus();
    nodeUnderCursor.select();
  } else if (document.activeElement && document.activeElement.classList.contains('node')) {
    document.activeElement.blur();
  }
}

function scrollMainSurfaceInDirection(direction) {
  var scrollDelta = {
    left:  {x: -64, y:   0},
    right: {x:  64, y:   0},
    up:    {x:   0, y: -32},
    down:  {x:   0, y:  32},
  }[direction];
  window.scrollBy(scrollDelta.x, scrollDelta.y);
  resetCursorBlink();
}

document.addEventListener('keypress', event => {
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
  if (event.key === 'S' && event.shiftKey && event.ctrlKey) {
    event.preventDefault();
    saveState();
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
    return {x: parseInt(node.style.left), y: parseInt(node.style.top)};
  }
  var points = [];
  if (link.from) points.push(pos(link.from));
  if (link.via)  points.push(pos(link.via));
  if (link.to)   points.push(pos(link.to));
  if (points.length < 3 && lastPosition) points.push(lastPosition);
  if (points.length >= 2) {
    link.setAttribute('points', points.map(point => point.x + ',' + point.y).join(' '));
  } else {
    link.setAttribute('points', '');
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
            highlightQueriedNodes();
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
        window.scrollBy(-cursor.deltaScreen.x, -cursor.deltaScreen.y);
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
mainSurface.addEventListener('mouseover', event => {
  if (event.target.classList.contains('node')) {
    event.target.instances.forEach(node => node.classList.add('instance-highlighted'));
  }
});
mainSurface.addEventListener('mouseout', event => {
  if (event.target.classList.contains('node')) {
    event.target.instances.forEach(node => node.classList.remove('instance-highlighted'));
  }
});

function prepareForSerialization(nodes, links) {
  var id = 0;
  var nodesSet = new Set(nodes);
  var linksSet = new Set(links);
  for (node of nodes) node.id = id++;
  for (link of links) {
    link.id = id++;
    link.setAttribute('data-from', link.from.id);
    link.setAttribute('data-via',  link.via.id);
    link.setAttribute('data-to',   link.to.id);
  }
  for (node of nodes) {
    node.setAttribute('data-links', [...node.links].filter(link => linksSet.has(link)).map(link => link.id).join(','));
    node.setAttribute('data-instances', [...node.instances].filter(node => nodesSet.has(node)).map(node => node.id).join(','));
    node.classList.remove('highlighted');
    node.classList.remove('selected');
  }
}

function deserialize(nodes, links) {
  for (link of links) {
    link.from = document.getElementById(link.getAttribute('data-from'));
    link.via  = document.getElementById(link.getAttribute('data-via'));
    link.to   = document.getElementById(link.getAttribute('data-to'));
  }
  for (node of nodes) {
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
  }
}

function clearSerialization(nodes, links) {
  for (link of links) {
    link.removeAttribute('id');
    link.removeAttribute('data-from');
    link.removeAttribute('data-via');
    link.removeAttribute('data-to');
  }
  for (node of nodes) {
    node.removeAttribute('id');
    node.removeAttribute('data-links');
    node.removeAttribute('data-instances')
  }
}

function saveState() {
  prepareForSerialization([...document.getElementsByClassName('node')], [...document.getElementsByClassName('link')]);
  localStorage.saved_state = mainSurface.innerHTML;
  currentSurface.appendChild(cursor);
}

function restoreState() {
  mainSurface.innerHTML = localStorage.saved_state;
  for (link of mainSurface.getElementsByClassName('link')) {
    link.from = document.getElementById(link.getAttribute('data-from'));
    link.via  = document.getElementById(link.getAttribute('data-via'));
    link.to   = document.getElementById(link.getAttribute('data-to'));
  }
  for (node of mainSurface.getElementsByClassName('node')) {
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
  }
  clearSerialization([...document.getElementsByClassName('node')], [...document.getElementsByClassName('link')]);
}
