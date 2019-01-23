var mainSurface = document.getElementById('main-surface');
var currentSurface = mainSurface;

function setCurrentSurface(surface) {
  if (currentSurface !== surface) {
    closeNameMatchPanel();
    currentSurface.classList.remove('current');
    surface.classList.add('current');
    currentSurface = surface;
    cursor       = currentSurface.getElementsByClassName('cursor')[0];
    selectionBox = currentSurface.getElementsByClassName('selection-box')[0];
  }
}

if (localStorage.saved_state) {
  replaceSurfaceFromHtml(localStorage.saved_state);
}


// Help

function toggleHelp() {
  document.body.classList.toggle('showing-help');
}
document.getElementById('help-button').addEventListener('click', toggleHelp);


// Cursor

var cursor = currentSurface.getElementsByClassName('cursor')[0];
function setCursorPosition(position) {
  resetCursorBlink();
  if (parseInt(cursor.style.left) === position.x && parseInt(cursor.style.top) === position.y) return;
  cursor.style.left = position.x + 'px';
  cursor.style.top  = position.y + 'px';
  cursor.scrollIntoView({block: 'nearest', inline: 'nearest'});
  evaluateCursorPosition();
  nameMatchPanel.remove();
}
function evaluateCursorPosition() {
  var nodeUnderCursor = getNodeUnderCursor();
  if (nodeUnderCursor) {
    nodeUnderCursor.focus();
  }
  for (node of document.getElementsByClassName('node')) {
    node.classList.toggle('cursor-at-instance', nodeUnderCursor && node.getAttribute('data-id') === nodeUnderCursor.getAttribute('data-id'));
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
  return getNodeAtPosition({x: parseInt(cursor_.style.left), y: parseInt(cursor_.style.top)});
}

function getNodeAtPosition(position, surface) {
  surface = surface || currentSurface;
  for (node of surface.getElementsByClassName('node')) {
    if ((position.y === parseInt(node.style.top)) &&
      (position.x >= parseInt(node.style.left)) && (position.x < (parseInt(node.style.left) + parseInt(node.style.width)))) {
      return node;
    }
  }
  return null;
}

var pxToGridX = px => Math.round(px / 64) * 64;
var pxToGridY = px => Math.round(px / 32) * 32;


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

function makeUuid() {
  var uints = window.crypto.getRandomValues(new Uint8Array(16));
  return Array.prototype.map.call(uints, i => ('00' + i.toString(16)).slice(-2)).join('');
}

function createNode(options) {
  var node = document.createElement('input');
  node.classList.add('node');
  node.setAttribute('data-id', makeUuid());
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
        recordAction(new deleteElementsAction([existingLink]));
      } else {
        linkBeingCreated.to = node;
        linkBeingCreated.to.links.add(linkBeingCreated);
        layoutLink(linkBeingCreated);
      }
      var createdLink = linkBeingCreated;
      linkBeingCreated = null;
      cursor.classList.remove('insert-mode');
      resetCursorBlink();
      return createdLink;
    }
  }
  return null;
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
        var createdLink = useNodeForLinkCreationMode(document.activeElement);
        if (createdLink) {
          recordAction(new createLinkAction(createdLink));
        }
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
  for (element of elements) {
    if (element.classList.contains('node')) {
      element.instances.delete(element);
      for (link of element.links) affectedLinks.add(link);
      element.remove();
    } else if (element.classList.contains('link')) {
      affectedLinks.add(element);
    }
  }
  for (link of affectedLinks) {
    link.from.links.delete(link);
    link.via.links.delete(link);
    link.to.links.delete(link);
    link.remove();
  }
  evaluateCursorPosition();
  return affectedLinks;
}

function deleteSelection() {
  var elementsToDelete = new Set(currentSurface.getElementsByClassName('selected'));
  if (document.activeElement && document.activeElement.classList.contains('node') && document.activeElement.closest('.surface') === currentSurface) {
    elementsToDelete.add(document.activeElement);
  }
  if (elementsToDelete.size === 0) return false;
  var focusedNodePosition = null;
  if (document.activeElement && document.activeElement.classList.contains('node')) {
    focusedNodePosition = {x: parseInt(document.activeElement.style.left), y: parseInt(document.activeElement.style.top)};
  }
  var affectedLinks = deleteElements(elementsToDelete);
  var cursorPositionBefore = {
    x: parseInt(cursor.style.left),
    y: parseInt(cursor.style.top),
  }
  if (focusedNodePosition) {
    var closestNode = getClosestNodeTo(focusedNodePosition);
    if (closestNode) {
      setCursorPosition({
        x: pxToGridX(parseInt(closestNode.style.left)),
        y: pxToGridY(parseInt(closestNode.style.top)),
      });
    }
  }
  var cursorPositionAfter = {
    x: parseInt(cursor.style.left),
    y: parseInt(cursor.style.top),
  }
  recordAction(
    new deleteElementsAction(new Set([...elementsToDelete, ...affectedLinks])),
    {
      cursor: {before: cursorPositionBefore, after: cursorPositionAfter},
      selectionBox: {before: getSelectionBox(), after: null},
    }
  );
  selectionBox.classList.add('hidden');
}

function cancelCurrentModeOrOperation() {

  deselectAll();

  if (document.body.classList.contains('showing-help')) {
    document.body.classList.remove('showing-help')
    return;
  }

  if (nameMatchPanel.parentElement) {
    closeNameMatchPanel();
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
  var selectedNodes = new Set([...currentSurface.querySelectorAll('.node.selected')]);
  if (document.activeElement && document.activeElement.classList.contains('node')) {
    selectedNodes.add(document.activeElement);
  }
  if (selectedNodes.size === 0) return;
  var affectedLinks = new Set();
  for (node of selectedNodes) {
    for (link of node.links) {
      if (
        selectedNodes.has(link.from) &&
        selectedNodes.has(link.via)  &&
        selectedNodes.has(link.to)
      ) affectedLinks.add(link);
    }
  }
  var html = getNodesAndLinksAsHtml(selectedNodes, affectedLinks);
  var previouslyFocusedElement = document.activeElement;
  var temporaryInput = document.createElement('input');
  temporaryInput.value = html;
  document.body.appendChild(temporaryInput);
  temporaryInput.select();
  document.execCommand('copy');
  temporaryInput.remove();
  if (options.cut) {
    deleteElements(selectedNodes);
    recordAction(new deleteElementsAction(selectedNodes));
  } else if (previouslyFocusedElement) {
    previouslyFocusedElement.focus();
  }
}

function getClosestNodeTo(position, nodes) {
  nodes = nodes || currentSurface.getElementsByClassName('node');
  var closestNode = null;
  var closestNodeDistance = null;
  for (var node of nodes) {
    var nodePosition = { x: parseInt(node.style.left),   y: parseInt(node.style.top)    };
    var delta        = { x: position.x - nodePosition.x, y: position.y - nodePosition.y };
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

function getNodesIntersectingBox(box, nodes) {
  nodes = nodes || [...currentSurface.getElementsByClassName('node')];
  return nodes.filter(node => {
    return !(
      ((parseInt(node.style.left) + node.offsetWidth)  <  box.left)  ||
       (parseInt(node.style.left)                      >= box.right) ||
      ((parseInt(node.style.top)  + node.offsetHeight) <  box.top)   ||
       (parseInt(node.style.top)                       >= box.bottom)
    );
  });
}

// Selection box
var selectionBox = currentSurface.getElementsByClassName('selection-box')[0];
function setSelectionBox(position, selectedNodesToPreserve) {
  if (!position.width)  position.width  = position.right  - position.left;
  if (!position.height) position.height = position.bottom - position.top;
  if (!position.right)  position.right  = position.left   + position.width;
  if (!position.bottom) position.bottom = position.top    + position.height;
  selectionBox.style.left   = position.left   + 'px';
  selectionBox.style.top    = position.top    + 'px';
  selectionBox.style.width  = position.width  + 'px';
  selectionBox.style.height = position.height + 'px';
  var intersectingNodes = new Set(getNodesIntersectingBox(position));
  for (node of [...currentSurface.getElementsByClassName('node')]) {
    if (selectedNodesToPreserve && selectedNodesToPreserve.has(node)) continue;
    node.classList.toggle('selected', intersectingNodes.has(node));
  }
}
function getSelectionBox() {
  if (selectionBox.classList.contains('hidden')) {
    return null;
  } else {
    return {
      left:   parseInt(selectionBox.style.left),
      top:    parseInt(selectionBox.style.top),
      right:  parseInt(selectionBox.style.left) + parseInt(selectionBox.style.width),
      bottom: parseInt(selectionBox.style.top)  + parseInt(selectionBox.style.height),
      width:  parseInt(selectionBox.style.width),
      height: parseInt(selectionBox.style.height),
    }
  }
}

function selectAll() {
  for (node of currentSurface.getElementsByClassName('node')) {
    node.classList.add('selected');
  }
  selectionBox.classList.add('hidden');
}

function deselectAll() {
  for (element of [...currentSurface.getElementsByClassName('selected')]) {
    element.classList.remove('selected');
  }
  selectionBox.classList.add('hidden');
}

var lastFocusedNodeOriginalName = null;

document.addEventListener('focusin', event => {
  if (event.target.classList.contains('node')) {
    lastFocusedNodeOriginalName = event.target.value;
  }
});

document.addEventListener('focusout', event => {
  if (event.target.classList.contains('node')) {
    if (event.target.value !== lastFocusedNodeOriginalName) {
      recordAction(new renameNodeAction(event.target, lastFocusedNodeOriginalName));
    }
  }
});

document.addEventListener('input', event => {
  if (event.target.classList.contains('node')) {
    var node = event.target;
    setNodeName(node, node.value);
    if (event.target.closest('#find-panel')) {
      highlightQueriedNodes();
    }
    while (nameMatchPanel.firstChild) nameMatchPanel.removeChild(nameMatchPanel.firstChild);
    if (event.target.value !== '') {
      var ids = new Map();
      for (node of mainSurface.getElementsByClassName('node')) {
        if (node != event.target && node.value.startsWith(event.target.value)) {
          ids.set(node.getAttribute('data-id'), node.value);
        }
      }
      for (entry of builtinNameMatches) {
        if (entry.name.startsWith(event.target.value)) {
          ids.set(entry.id, entry.name);
        }
      }
      if (ids.size > 0) {
        for ([id, name] of ids) {
          var match = document.createElement('div');
          match.classList.add('name-match');
          match.setAttribute('data-id', id);
          match.textContent = name;
          nameMatchPanel.appendChild(match);
        }
        nameMatchPanel.style.left = event.target.style.left;
        nameMatchPanel.style.top  = (parseInt(event.target.style.top) + 32) + 'px';
        currentSurface.appendChild(nameMatchPanel);
      } else {
        nameMatchPanel.remove();
      }
    } else {
      nameMatchPanel.remove();
    }
  }
});

function setNodeName(node, name) {
  var instances = [...document.querySelectorAll(`[data-id="${node.getAttribute('data-id')}"]`)];
  for (instance of instances) {
    instance.value = name;
    instance.setAttribute('value', name);
    var width = (Math.ceil(((name.length * 9) + 5) / 64) * 64) - 14;
    instance.style.width = width + 'px';
  }
}

function moveNodesToPosition(nodes, position) {
  var leftmost = Math.min(...nodes.map(node => parseInt(node.style.left)));
  var topmost  = Math.min(...nodes.map(node => parseInt(node.style.top)));
  var deltaX = pxToGridX(parseInt(position.x)) - leftmost;
  var deltaY = pxToGridY(parseInt(position.y)) - topmost;
  var affectedLinks = new Set();
  for (node of nodes) {
    node.style.left = (parseInt(node.style.left) + deltaX) + 'px';
    node.style.top  = (parseInt(node.style.top)  + deltaY) + 'px';
    for (link of node.links) affectedLinks.add(link);
  }
  for (link of affectedLinks) layoutLink(link);
}


// Name match panel

var nameMatchPanel = document.getElementById('name-match-panel');

var builtinNameMatches = [];

function moveNameMatchSelection(direction) {
  var matches = nameMatchPanel.getElementsByClassName('name-match');
  if (matches.length > 0) {
    var selectedMatch = nameMatchPanel.getElementsByClassName('selected')[0];
    if (selectedMatch) {
      var otherMatch = direction === 'next' ? selectedMatch.nextElementSibling : selectedMatch.previousElementSibling;
      if (otherMatch) {
        selectedMatch.classList.remove('selected');
        for (node of document.querySelectorAll(`.node[data-id='${selectedMatch.getAttribute('data-id')}']`)) {
          node.classList.remove('name-match-selected');
        }
        otherMatch.classList.add('selected');
        for (node of document.querySelectorAll(`.node[data-id='${otherMatch.getAttribute('data-id')}']`)) {
          node.classList.add('name-match-selected');
        }
      }
    } else {
      matches[0].classList.add('selected');
      for (node of document.querySelectorAll(`.node[data-id='${matches[0].getAttribute('data-id')}']`)) {
        node.classList.add('name-match-selected');
      }
    }
  }
}

function applyCurrentNameMatchSelection(nameMatch) {
  nameMatch = nameMatch || nameMatchPanel.getElementsByClassName('selected')[0];
  var node = getNodeUnderCursor();
  if (node.getAttribute('data-id') !== nameMatch.getAttribute('data-id')) {
    var oldId = node.getAttribute('data-id');
    var oldName = node.value;
    node.setAttribute('data-id', nameMatch.getAttribute('data-id'));
    setNodeName(node, nameMatch.textContent);
    lastFocusedNodeOriginalName = nameMatch.textContent;
    recordAction(new changeIdAction(node, {id: oldId, name: oldName}, {id: nameMatch.getAttribute('data-id'), name: nameMatch.textContent}));
  }
  nameMatchPanel.remove();
  resetCursorBlink();
  for (otherNode of document.getElementsByClassName('node')) {
    otherNode.classList.remove('name-match-selected');
    otherNode.classList.toggle('cursor-at-instance', otherNode.getAttribute('data-id') === nameMatch.getAttribute('data-id'));
  }
}

nameMatchPanel.addEventListener('click', event => {
  if (event.target.classList.contains('name-match')) {
    applyCurrentNameMatchSelection(event.target);
  }
});

function closeNameMatchPanel() {
  nameMatchPanel.remove();
  for (node of [...document.getElementsByClassName('name-match-selected')]) {
    node.classList.remove('name-match-selected');
  }
}


document.addEventListener('paste', event => {
  if (event.clipboardData.items.length !== 1) return;
  var item = event.clipboardData.items[0];
  if (item.kind !== 'string') return;
  item.getAsString(string => {
    var inserted = insertNodesAndLinksFromHtml(string);
    var nodes = inserted.nodes;
    var links = inserted.links;
    moveNodesToPosition(nodes, {x: cursor.style.left, y: cursor.style.top});
    for (node of nodes) {
      node.classList.add('selected');
    }
    evaluateCursorPosition();
    var selectionBox = getSelectionBox();
    recordAction(
      new pasteElementsAction(nodes, links),
      {
        selectionBox: {before: selectionBox, after: null},
      }
    );
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


// Find panel

var findPanel = document.getElementById('find-panel');

function testNodesFindMatch(findNode, targetNode) {
  return !findNode.value ||
         findNode.value === '*' ||
         targetNode.getAttribute('data-id') === findNode.getAttribute('data-id') ||
         (findNode.value === '$' && (targetNode.classList.contains('selected') || (targetNode === getNodeUnderCursor(mainSurface))));
}
function getQueriedNodes() {
  var findPanelNodes = [...findPanel.getElementsByClassName('node')];
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
          var instances = mainSurface.querySelectorAll(`.node[data-id='${targetNode.getAttribute('data-id')}']`);
          for (instance of instances) queryResult.add(instance);
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
    createNode({position: {x: 0, y: 0}, parent: findPanelNodes});
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
    setCursorPosition({
      x: parseInt([...queriedNodes][0].style.left),
      y: parseInt([...queriedNodes][0].style.top),
    });
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
    return parseInt(node.style.left) + moveDelta.x < 0 ||
           parseInt(node.style.top)  + moveDelta.y < 0;
  });
  if (willNodeBeMovedOutOfBounds) return false;

  var oldPositions = [...nodesToMove].map(node => {return {node: node, left: node.style.left, top: node.style.top}});

  for (node of nodesToMove) {
    node.style.left = (parseInt(node.style.left) + moveDelta.x) + 'px';
    node.style.top  = (parseInt(node.style.top)  + moveDelta.y) + 'px';
    node.links.forEach(link => affectedLinks.add(link));
  }
  affectedLinks.forEach(link => layoutLink(link));

  var cursorBefore = {
    x: parseInt(cursor.style.left),
    y: parseInt(cursor.style.top),
  }
  cursor.style.left = (parseInt(cursor.style.left) + moveDelta.x) + 'px';
  cursor.style.top  = (parseInt(cursor.style.top)  + moveDelta.y) + 'px';
  var cursorAfter = {
    x: parseInt(cursor.style.left),
    y: parseInt(cursor.style.top),
  }

  var selectionBoxBefore = getSelectionBox();
  selectionBox.style.left = (parseInt(selectionBox.style.left) + moveDelta.x) + 'px';
  selectionBox.style.top  = (parseInt(selectionBox.style.top)  + moveDelta.y) + 'px';
  var selectionBoxAfter = getSelectionBox();

  var newPositions = [...nodesToMove].map(node => {return {node: node, left: node.style.left, top: node.style.top}});

  recordAction(
    new moveNodesAction({oldPositions, newPositions}),
    {
      cursor: {before: cursorBefore, after: cursorAfter},
      selectionBox: {before: selectionBoxBefore, after: selectionBoxAfter}
    }
  );
}

function createInstanceInDirection(direction) {
  if (!document.activeElement || !document.activeElement.classList.contains('node')) {
    return;
  }

  var node = document.activeElement;

  if (getAdjacentNodesInDirection(node, direction).length !== 0) {
    return;
  }

  var instance = document.createElement('input');
  instance.classList.add('node');
  instance.setAttribute('data-id', node.getAttribute('data-id'));
  instance.value = node.value;
  instance.style.width = node.style.width;
  instance.setAttribute('value', node.value);
  if (direction === 'down') {
    instance.style.left = node.style.left;
    instance.style.top  = (parseInt(node.style.top) + 32) + 'px';
  } else if (direction === 'right') {
    instance.style.left = pxToGridX(parseInt(node.style.left) + parseInt(node.style.width)) + 'px';
    instance.style.top = node.style.top;
  } else if (direction === 'up') {
    instance.style.left = node.style.left;
    instance.style.top  = (parseInt(node.style.top) - 32) + 'px';
  } else if (direction === 'left') {
    instance.style.left = pxToGridX(parseInt(node.style.left) - parseInt(node.style.width)) + 'px';
    instance.style.top = node.style.top;
  }
  instance.links = new Set();
  node.instances.add(instance);
  instance.instances = node.instances;
  currentSurface.getElementsByClassName('nodes')[0].appendChild(instance);

  setCursorPosition({x: parseInt(instance.style.left), y: parseInt(instance.style.top)});

  recordAction(new createElementsAction([instance]));
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
  var cursorPositionBefore = {
    x: parseInt(cursor.style.left),
    y: parseInt(cursor.style.top),
  }
  var cursorPositionAfter = {
    x: pxToGridX(parseInt(newNode.style.left)),
    y: pxToGridY(parseInt(newNode.style.top)),
  }
  setCursorPosition(cursorPositionAfter);
  deselectAll();
  var createdElements = [newNode];
  if (linkBeingCreated) {
    var createdLink = useNodeForLinkCreationMode(newNode);
    if (createdLink) {
      createdElements.push(createdLink);
    }
  }
  recordAction(new createElementsAction(createdElements), {cursor: {before: cursorPositionBefore, after: cursorPositionAfter}});
  return newNode;
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
    if (selectionBox.classList.contains('hidden')) {
      selectionBox.anchorPosition = {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
    }
    var selectionBoxLeft   = Math.min(selectionBox.anchorPosition.x, cursorX);
    var selectionBoxTop    = Math.min(selectionBox.anchorPosition.y, cursorY);
    var selectionBoxWidth  = Math.max(0, Math.abs(selectionBox.anchorPosition.x - cursorX));
    var selectionBoxHeight = Math.max(0, Math.abs(selectionBox.anchorPosition.y - cursorY));
    var selectionBoxRight  = selectionBoxLeft + selectionBoxWidth;
    var selectionBoxBottom = selectionBoxTop  + selectionBoxHeight;
    setSelectionBox({
      left:   selectionBoxLeft,
      top:    selectionBoxTop,
      right:  selectionBoxRight,
      bottom: selectionBoxBottom,
    });
    selectionBox.classList.remove('hidden');
  } else {
    deselectAll();
  }
  if (linkBeingCreated) {
    layoutLink(linkBeingCreated, {x: cursorX + 32, y: cursorY + 16});
  }
  setCursorPosition({x: cursorX, y: cursorY});
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

function getNodeCenter(node) {
  return {
    x: parseInt(node.style.left) + (parseInt(node.style.width) / 2) + 5,
    y: parseInt(node.style.top) + 16,
  }
}

function getNodeBoundingBox(node) {
  return {
    left:   parseInt(node.style.left),
    top:    parseInt(node.style.top),
    width:  parseInt(node.style.width),
    height: parseInt(node.style.height),
    right:  parseInt(node.style.left) + parseInt(node.style.width),
    bottom: parseInt(node.style.top) + parseInt(node.style.height),
  };
}

function getNodeAnchorPoints(node) {
  return [
    {point: getNodeCenter(node)},
    {point: {x: parseInt(node.style.left) + 18, y: parseInt(node.style.top) + 16}},
    {point: {x: parseInt(node.style.left) + parseInt(node.style.width) - 8, y: parseInt(node.style.top) + 16}},
  ]
}

function layoutLink(link, lastPosition) {
  function pos(node) {
    return {x: parseInt(node.style.left) + 32, y: parseInt(node.style.top) + 16};
  }
  var points = [];
  if (link.from) {
    var nextPoint = link.via ? getNodeCenter(link.via) : lastPosition;
    var anchorPoints = getNodeAnchorPoints(link.from);
    for (anchor of anchorPoints) {
      anchor.distance = Math.pow(nextPoint.x - anchor.point.x, 2) + Math.pow(nextPoint.y - anchor.point.y, 2);
    }
    anchorPoints.sort((a, b) => a.distance - b.distance);
    points.push(anchorPoints[0].point);
  }
  if (link.via)  points.push(getNodeCenter(link.via));
  if (link.to) {
    var viaPoint = getNodeCenter(link.via);
    var anchorPoints = getNodeAnchorPoints(link.to);
    for (anchor of anchorPoints) {
      anchor.distance = Math.pow(viaPoint.x - anchor.point.x, 2) + Math.pow(viaPoint.y - anchor.point.y, 2);
    }
    anchorPoints.sort((a, b) => a.distance - b.distance);
    points.push(anchorPoints[0].point);
  }
  if (points.length < 3 && lastPosition) points.push(lastPosition);
  if (points.length >= 2) {
    link.setAttribute('points', points.map(point => point.x + ',' + point.y).join(' '));
  } else {
    link.setAttribute('points', '');
  }
}


function deserialize(nodes, links) {
  for (link of links) {
    link.from = document.getElementById(link.getAttribute('data-from'));
    link.via  = document.getElementById(link.getAttribute('data-via'));
    link.to   = document.getElementById(link.getAttribute('data-to'));
  }
  for (node of nodes) {
    var linksList = node.getAttribute('data-links');
    if (linksList) {
      node.links = new Set(linksList.split(',').map(id => document.getElementById(id)));
    } else {
      node.links = new Set();
    }
    node.instances = new Set(node.getAttribute('data-instances').split(',').map(id => document.getElementById(id)));
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

function getNodesAndLinksAsHtml(nodes, links) {
  var nodes = nodes || [...mainSurface.getElementsByClassName('node')];
  var links = links || [...mainSurface.getElementsByClassName('link')];

  var classes = new Map();
  for (node of nodes) {
    classes.set(node, node.className);
    node.className = 'node';
  }
  for (link of links) {
    classes.set(link, link.className.baseVal);
    link.className.baseVal = 'link';
  }

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
    if (node.links.size > 0) {
      node.setAttribute('data-links', [...node.links].filter(link => linksSet.has(link)).map(link => link.id).join(','));
    }
    node.setAttribute('data-instances', [...node.instances].filter(node => nodesSet.has(node)).map(node => node.id).join(','));
  }

  var html = '<div class="nodes">' + [...nodes].map(node => node.outerHTML).join('') + '</div>' +
             '<svg class="links">' + [...links].map(link => link.outerHTML).join('') + '</svg>';

  clearSerialization(nodes, links);

  for ([element, className] of classes) {
    if (element.classList.contains('link')) {
      element.className.baseVal = className;
    } else {
      element.className = className;
    }
  }

  return html;
}

function insertNodesAndLinksFromHtml(html) {
  var fragment = document.createRange().createContextualFragment(html);
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
  var leftmost = Math.min(...nodes.map(node => parseInt(node.style.left)));
  var topmost  = Math.min(...nodes.map(node => parseInt(node.style.top)));
  var deltaX = pxToGridX(parseInt(cursor.style.left)) - leftmost;
  var deltaY = pxToGridY(parseInt(cursor.style.top))  - topmost;
  for (node of nodes) {
    node.style.left = (parseInt(node.style.left) + deltaX) + 'px';
    node.style.top  = (parseInt(node.style.top)  + deltaY) + 'px';
    node.classList.add('selected');
  }
  links.forEach(layoutLink);
  evaluateCursorPosition();
  return {nodes, links};
}

function replaceSurfaceFromHtml(html) {
  var originalCursor       = mainSurface.getElementsByClassName('cursor')[0];
  var originalSelectionBox = mainSurface.getElementsByClassName('selection-box')[0];

  mainSurface.innerHTML = html;
  var nodes = mainSurface.getElementsByClassName('node');
  var links = mainSurface.getElementsByClassName('link');
  deserialize(nodes, links);
  clearSerialization(nodes, links);

  var newCursor       = mainSurface.appendChild(originalCursor);
  var newSelectionBox = mainSurface.appendChild(originalSelectionBox);
  if (currentSurface === mainSurface) {
    cursor = newCursor;
    selectionBox = newSelectionBox;
  }

  evaluateCursorPosition();
}


// File drag-drop

mainSurface.addEventListener('dragenter', event => {
  event.preventDefault();
  return false;
});
mainSurface.addEventListener('dragover', event => {
  event.preventDefault();
  setCursorPosition({
    x: pxToGridX(event.offsetX),
    y: pxToGridY(event.offsetY),
  });
  return false;
});
mainSurface.addEventListener('drop', event => {
  event.preventDefault();
  var html = event.dataTransfer.getData('text/html');
  if (html) {
    var inserted = insertNodesAndLinksFromHtml(html);
    var nodes = inserted.nodes;
    var links = inserted.links;
    moveNodesToPosition(nodes, {x: cursor.style.left, y: cursor.style.top});
    recordAction(new pasteElementsAction(nodes, links));
  } else if (event.dataTransfer.files.length > 0) {
    var file = event.dataTransfer.files[0];
    var reader = new FileReader();
    reader.onload = function(event) {
      var inserted = insertNodesAndLinksFromHtml(event.target.result);
      var nodes = inserted.nodes;
      var links = inserted.links;
      moveNodesToPosition(nodes, {x: cursor.style.left, y: cursor.style.top});
      recordAction(new pasteElementsAction(nodes, links));
    };
    reader.readAsText(file);
  }
  return false;
});

var exportButton = document.getElementById('export-button');

exportButton.addEventListener('dragenter', event => {
  event.preventDefault();
  return false;
});
exportButton.addEventListener('dragover', event => {
  event.preventDefault();
  return false;
});

exportButton.addEventListener('drop', event => {
  event.preventDefault();
  var html = event.dataTransfer.getData('text/html');
  if (html) {
    var oldHtml = getNodesAndLinksAsHtml();
    replaceSurfaceFromHtml(html);
    recordAction(new replaceSurfaceAction(oldHtml, html));
  } else if (event.dataTransfer.files.length > 0) {
    var file = event.dataTransfer.files[0];
    var reader = new FileReader();
    reader.onload = function(event) {
      var html = event.target.result;
      var oldHtml = getNodesAndLinksAsHtml();
      replaceSurfaceFromHtml(html);
      recordAction(new replaceSurfaceAction(oldHtml, html));
    };
    reader.readAsText(file);
  }
  return false;
});

exportButton.addEventListener('dragstart', event => {
  event.dataTransfer.setData("text/html", getNodesAndLinksAsHtml());
});
