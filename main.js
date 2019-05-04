'use strict';

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

let bottomPanelContainer = document.querySelectorAll('.panels-container.bottom')[0];

// Cursor

var cursor = currentSurface.getElementsByClassName('cursor')[0];
function getCursorPosition() {
  return {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
}
function setCursorPosition(position) {
  resetCursorBlink();

  if (parseInt(cursor.style.left) === position.x && parseInt(cursor.style.top) === position.y) {
    return;
  }
  if (position.x < 0 || position.y < 0) {
    throw `Invalid cursor position: {x: ${position.x}, y: ${position.y}}`;
  }

  cursor.style.left = position.x + 'px';
  cursor.style.top  = position.y + 'px';

  if (linkBeingCreated) {
    layoutLink(linkBeingCreated, {x: position.x + 32, y: position.y + 16});
  }

  var nodeUnderCursor = getNodeAtCursor();

  // Highlighting
  for (const element of [...currentSurface.getElementsByClassName('highlight-for-connected')]) {
    element.classList.remove('highlight-for-connected');
  }
  if (nodeUnderCursor) {
    var nodesToHighlight = new Set();
    for (const link of nodeUnderCursor.links) {
      link.classList.add('highlight-for-connected');
      link.parentElement.appendChild(link); // Bring to front
      nodesToHighlight.add(link.from);
      nodesToHighlight.add(link.via);
      nodesToHighlight.add(link.to);
    }
    for (const node of nodesToHighlight) {
      node.classList.add('highlight-for-connected');
    }
  }

  // Scroll into view
  if (currentSurface === mainSurface) {
    if (nodeUnderCursor) {
      nodeUnderCursor.scrollIntoView({block: 'nearest', inline: 'nearest'});
    } else {
      cursor.scrollIntoView({block: 'nearest', inline: 'nearest'});
    }
  }

  evaluateCursorPosition();

  nameMatchPanel.remove();
}
function moveCursorToNode(node) {
  setCursorPosition({x: parseInt(node.style.left), y: parseInt(node.style.top)});
}
function evaluateCursorPosition() {
  var nodeUnderCursor = getNodeAtCursor();
  if (nodeUnderCursor) {
    nodeUnderCursor.focus();
    nodeUnderCursor.select();
  }
  for (let node of document.getElementsByClassName('node')) {
    node.classList.toggle('cursor-at-instance', nodeUnderCursor && node.dataset.id === nodeUnderCursor.dataset.id);
  }
}
function resetCursorBlink() {
  cursor.classList.remove('blinking');
  cursor.offsetHeight;
  cursor.classList.add('blinking');
}
function getNodeAtCursor(surface) {
  surface = surface || currentSurface;
  var cursor_ = surface.getElementsByClassName('cursor')[0];
  return getNodeAtPosition({x: parseInt(cursor_.style.left), y: parseInt(cursor_.style.top)});
}
function moveCursorToBlockEdge(direction, options) {
  options = options || {};
  var cursorPosition = {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
  var nodesInRow = [...currentSurface.getElementsByClassName('node')].filter(node => node.style.top === cursor.style.top);
  if (options.dragSelectionBox && selectionBox.classList.contains('hidden')) {
    selectionBox.anchorPosition = cursorPosition;
  }
  if (direction === 'left') {
    var nodesToLeft = nodesInRow.filter(node => parseInt(node.style.left) < cursorPosition.x);
    if (nodesToLeft.length > 0) {
      nodesToLeft.sort((a, b) => parseInt(a.style.left) - parseInt(b.style.left));
      var node = nodesToLeft[nodesToLeft.length - 1];
      if ((cursorPosition.x - (parseInt(node.style.left) + parseInt(node.style.width))) > 20) {
        moveCursorToNode(node);
      } else {
        for (var i = nodesToLeft.length - 2; i >= 0; i--) {
          if ((parseInt(node.style.left) - (parseInt(nodesToLeft[i].style.left) + parseInt(nodesToLeft[i].style.width))) > 20) {
            break;
          }
          node = nodesToLeft[i];
        }
        moveCursorToNode(node);
      }
    } else {
      setCursorPosition({x: 0, y: cursorPosition.y});
    }
  } else if (direction === 'right') {
    var nodesToRight = nodesInRow.filter(node => parseInt(node.style.left) > cursorPosition.x);
    if (nodesToRight.length === 0) {
      return;
    }
    nodesToRight.sort((a, b) => parseInt(a.style.left) - parseInt(b.style.left));
    var node = nodesToRight[0];
    var nodeAtCursor = getNodeAtCursor();
    if (!nodeAtCursor || (parseInt(node.style.left) - (parseInt(nodeAtCursor.style.left) + parseInt(nodeAtCursor.style.width)) > 20)) {
      moveCursorToNode(node);
    } else {
      for (var i=1; i < nodesToRight.length; i++) {
        if ((parseInt(nodesToRight[i].style.left) - (parseInt(node.style.left) + parseInt(node.style.width))) > 20) {
          break;
        }
        node = nodesToRight[i];
      }
      moveCursorToNode(node);
    }
  }
  if (options.dragSelectionBox) {
    cursorPosition = {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
    setSelectionBox(getBoundingBoxForPoints(selectionBox.anchorPosition, cursorPosition));
    selectionBox.classList.remove('hidden');
  } else {
    deselectAll();
  }
}

function getBoundingBoxForPoints(pointA, pointB) {
  var left   = Math.min(pointA.x, pointB.x);
  var top    = Math.min(pointA.y, pointB.y);
  var right  = Math.max(pointA.x, pointB.x);
  var bottom = Math.max(pointA.y, pointB.y);
  var width  = right - left;
  var height = bottom - top;
  return {left, top, right, bottom, width, height};
}

function getNodeAtPosition(position, surface) {
  surface = surface || currentSurface;
  for (let node of surface.getElementsByClassName('node')) {
    if ((position.y === parseInt(node.style.top)) &&
      (position.x >= parseInt(node.style.left)) && (position.x < (parseInt(node.style.left) + parseInt(node.style.width)))) {
      return node;
    }
  }
  return null;
}

function getNodeClosestToPosition(position, surface) {
  surface = surface || currentSurface;
  var closestNode = null;
  var closestDistance = null;
  for (let node of surface.getElementsByClassName('node')) {
    var deltaX = parseInt(node.style.left) - position.x;
    var deltaY = parseInt(node.style.top)  - position.y;
    var distance = (deltaX*deltaX) + (deltaY*deltaY);
    if (!closestNode || (distance < closestDistance)) {
      closestNode = node;
      closestDistance = distance;
    }
  }
  return closestNode;
}

var pxToGridX = px => Math.round(px / 64) * 64;
var pxToGridY = px => Math.round(px / 32) * 32;



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
  node.links = new Set();
  if (options && options.parent) {
    options.parent.appendChild(node);
  } else {
    currentSurface.getElementsByClassName('nodes')[0].appendChild(node);
  }
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
  if (!linkBeingCreated) {
    linkBeingCreated = createLink();
    let nodeAtCursor = getNodeAtCursor();
    if (nodeAtCursor) {
      useNodeForLinkCreationMode(nodeAtCursor);
    }
    cursor.classList.add('insert-mode');
    resetCursorBlink();
    nameMatchPanel.remove();
  } else {
    let nodeAtCursor = getNodeAtCursor();
    if (nodeAtCursor) {
      var createdLink = useNodeForLinkCreationMode(nodeAtCursor);
      if (createdLink) {
        recordAction(new createElementsAction([createdLink]));
      }
    } else {
      cancelLinkMode();
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
  for (let element of elements) {
    if (element.classList.contains('node')) {
      for (let link of element.links) affectedLinks.add(link);
      element.remove();
    } else if (element.classList.contains('link')) {
      affectedLinks.add(element);
    }
  }
  for (let link of affectedLinks) {
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
  let nodeAtCursor = getNodeAtCursor();
  if (nodeAtCursor) {
    elementsToDelete.add(nodeAtCursor);
  }
  if (elementsToDelete.size === 0) return false;
  var focusedNodePosition = null;
  if (document.activeElement && document.activeElement.classList.contains('node')) {
    focusedNodePosition = {x: parseInt(document.activeElement.style.left), y: parseInt(document.activeElement.style.top)};
  }
  var affectedLinks = deleteElements(elementsToDelete);
  recordAction(
    new deleteElementsAction(new Set([...elementsToDelete, ...affectedLinks])),
    {
      selectionBox: {before: getSelectionBox(), after: null},
    }
  );
  selectionBox.classList.add('hidden');
}

function backspace() {
  if (currentSurface.getElementsByClassName('selected').length > 0) {
    deleteSelection();
  } else if (document.activeElement && document.activeElement.classList.contains('node')) {
    var node = document.activeElement;
    if (node.value !== '') {
      setNodeName(node, node.value.slice(0, -1));
    } else {
      var affectedLinks = deleteElements([node]);
      var oldCursorPosition = getCursorPosition();
      var newCursorPosition = {x: Math.max(0, oldCursorPosition.x - 64), y: oldCursorPosition.y};
      setCursorPosition(newCursorPosition);
      recordAction(
        new deleteElementsAction([node, ...affectedLinks]),
        {cursor: {before: oldCursorPosition, after: newCursorPosition}}
      );
    }
  } else {
    setCursorPosition({x: Math.max(0, parseInt(cursor.style.left) - 64), y: parseInt(cursor.style.top)});
  }
}

function cancelCurrentModeOrOperation() {

  deselectAll();

  if (nameMatchPanel.parentElement) {
    closeNameMatchPanel();
    return;
  }

  if (linkBeingCreated || cursor.classList.contains('insert-mode')) {
    cancelLinkMode();
    return;
  }
  
  if (bottomPanelContainer.classList.contains('expanded')) {
    bottomPanelContainer.classList.remove('expanded');
    bottomPanelContainer.dataset.panel = '';
    for (let highlighted of [...mainSurface.getElementsByClassName('highlighted')]) {
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
  for (let node of selectedNodes) {
    for (let link of node.links) {
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
    // Don't delete nodes that have links to unselected nodes
    var nodesToDelete = new Set([...selectedNodes].filter(node =>
      [...node.links].every(link =>
        selectedNodes.has(link.from) &&
        selectedNodes.has(link.via)  &&
        selectedNodes.has(link.to)
      )
    ));
    if (nodesToDelete.size > 0 || affectedLinks.size > 0) {
      var elements = [...nodesToDelete, ...affectedLinks];
      deleteElements(elements);
      recordAction(new deleteElementsAction(elements));
    }
  } else if (previouslyFocusedElement) {
    previouslyFocusedElement.focus();
  }
}

function getClosestNodeTo(position, nodes) {
  nodes = nodes || currentSurface.getElementsByClassName('node');
  var closestNode = null;
  var closestNodeDistance = null;
  for (let node of nodes) {
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
    for (let node of currentSet) {
      getAdjacentNodesInDirection(node, direction).forEach(n => newSet.add(n));
    }
    newSet.forEach(n => adjacentNodes.push(n));
    currentSet = [...newSet];
  } while(currentSet.length !== 0)
  return adjacentNodes;
}

function getNodesOrganizedIntoRows(nodes) {
  var rows = [];
  for (const node of nodes) {
    var nodeY = parseInt(node.style.top);
    var row = nodeY / 32;
    rows[row] = rows[row] || [];
    rows[row].push(node);
  }
  return rows;
}

function getNodesOrganizedIntoColumns(nodes) {
  var columns = [];
  for (const node of nodes) {
    var nodeX = parseInt(node.style.left);
    var nodeWidth = parseInt(node.style.width);
    var column = nodeX / 64;
    var columnCount = pxToGridX(nodeWidth) / 64;
    for (let c=0; c < columnCount; c++) {
      columns[column+c] = columns[column+c] || [];
      columns[column+c].push(node);
    }
  }
  return columns;
}

function getTouchingNodesInDirection(sourceNodes, direction, nodes) {
  if (direction === 'left' || direction === 'right') {
    var rows = getNodesOrganizedIntoRows(nodes);
    var touchingNodes = [];
    for (const row of rows) {
      if (!row) {
        continue;
      }
      if (direction === 'left') {
        row.sort((a,b) => parseInt(a.style.left) - parseInt(b.style.left));
      } else if (direction === 'right') {
        row.sort((a,b) => parseInt(b.style.left) - parseInt(a.style.left));
      }
      var lastNodeEdge = null;
      var lastNodeWasSourceNode = null;
      var currentBlock = [];
      for (const node of row) {
        var leftEdge = parseInt(node.style.left);
        var rightEdge = leftEdge + parseInt(node.style.width);
        var edge = (direction === 'left') ? leftEdge : rightEdge;
        var isSourceNode = sourceNodes.has(node);
        if (lastNodeEdge !== null && Math.abs(edge - lastNodeEdge) < 20) {
          if (isSourceNode) {
            touchingNodes.push(...currentBlock);
            currentBlock = [];
          } else {
            currentBlock.push(node);
          }
        } else {
          currentBlock = [node];
        }
        lastNodeEdge = (direction === 'left') ? rightEdge : leftEdge;
        lastNodeWasSourceNode = isSourceNode;
      }
    }
    return touchingNodes;
  } else if (direction === 'up' || direction === 'down') {
    var touchingNodes = new Set();
    var columns = getNodesOrganizedIntoColumns(nodes);
    for (const column of columns) {
      if (!column) {
        continue;
      }
      if (direction === 'up') {
        column.sort((a,b) => parseInt(b.style.top) - parseInt(a.style.top));
      } else if (direction === 'down') {
        column.sort((a,b) => parseInt(a.style.top) - parseInt(b.style.top));
      }
    }
    var maxY = Math.max(...columns.filter(column => column).map(column => parseInt((direction === 'down' ? column[column.length-1] : column[0]).style.top)));
    var rowCount = (maxY + 32) / 32;
    for (let row = 0; row < rowCount; row++) {
      var normalizedRow = direction === 'down' ? row : (rowCount - row);
      var rowPx = (normalizedRow * 32) + 'px';
      for (const column of columns) {
        if (!column) {
          continue;
        }
        var nodeIndex = column.findIndex(node => node.style.top === rowPx);
        if (nodeIndex >= 1) {
          var node     = column[nodeIndex];
          var prevNode = column[nodeIndex-1];
          if (Math.abs(parseInt(prevNode.style.top) - parseInt(node.style.top)) === 32) {
            if (sourceNodes.has(prevNode) || touchingNodes.has(prevNode)) {
              touchingNodes.add(node);
            }
          }
        }
      }
    }
    return touchingNodes;
  }
}

function getNodeGroups() {
  var visitedNodes = new Set();
  var groups = [];
  for (const node of currentSurface.getElementsByClassName('node')) {
    if (!visitedNodes.has(node)) {
      var group = new Set();
      var nodesToVisit = new Set([node]);
      while (nodesToVisit.size > 0) {
        var visitingNode = nodesToVisit.values().next().value;
        nodesToVisit.delete(visitingNode);
        group.add(visitingNode);
        visitedNodes.add(visitingNode);
        for (let link of visitingNode.links) {
          if (!group.has(link.from)) {
            nodesToVisit.add(link.from);
          }
          if (!group.has(link.via)) {
            nodesToVisit.add(link.via);
          }
          if (!group.has(link.to)) {
            nodesToVisit.add(link.to);
          }
        }
      }
      groups.push(group);
    }
  }
  return groups;
}

function getGroupsOrganizedIntoRows(groups) {
  var rows = [];
  for (const group of groups) {
    for (const node of group) {
      var nodeY = parseInt(node.style.top);
      var row = nodeY / 32;
      rows[row] = rows[row] || [];
      rows[row].push({group, node});
    }
  }
  return rows;
}

function getGroupsOrganizedIntoColumns(groups) {
  var columns = [];
  for (const group of groups) {
    for (const node of group) {
      var nodeX = parseInt(node.style.left);
      var nodeWidth = parseInt(node.style.width);
      var column = nodeX / 64;
      var columnCount = pxToGridX(nodeWidth) / 64;
      for (let c=0; c < columnCount; c++) {
        columns[column+c] = columns[column+c] || [];
        columns[column+c].push({group, node});
      }
    }
  }
  return columns;
}

function getTouchingGroupsInDirection(sourceNodes, direction, groups) {
  groups = groups || getNodeGroups();

  if (direction === 'left' || direction === 'right') {
    var rows = getGroupsOrganizedIntoRows(groups);

    for (const row of rows) {
      if (!row) {
        continue;
      }
      if (direction === 'left') {
        row.sort((a,b) => parseInt(a.node.style.left) - parseInt(b.node.style.left));
      } else if (direction === 'right') {
        row.sort((a,b) => parseInt(b.node.style.left) - parseInt(a.node.style.left));
      }
      var lastNodeEdge = null;
      var lastNodeGroup = null;
      for (const entry of row) {
        var leftEdge = parseInt(entry.node.style.left);
        var rightEdge = leftEdge + parseInt(entry.node.style.width);
        var edge = (direction === 'left') ? leftEdge : rightEdge;
        if (lastNodeEdge !== null && (entry.group !== lastNodeGroup)) {
          if (Math.abs(edge - lastNodeEdge) < 20) {
            entry.group.touches = entry.group.touches || new Set();
            entry.group.touches.add(lastNodeGroup);
          }
        }
        lastNodeEdge = (direction === 'left') ? rightEdge : leftEdge;
        lastNodeGroup = entry.group;
      }
    }
  } else if (direction === 'up' || direction === 'down') {
    var columns = getGroupsOrganizedIntoColumns(groups);

    for (const column of columns) {
      if (!column) {
        continue;
      }
      if (direction === 'up') {
        column.sort((a,b) => parseInt(a.node.style.top) - parseInt(b.node.style.top));
      } else if (direction === 'down') {
        column.sort((a,b) => parseInt(b.node.style.top) - parseInt(a.node.style.top));
      }
      var lastNodeEdge = null;
      var lastNodeGroup = null;
      for (const entry of column) {
        var topEdge = parseInt(entry.node.style.top);
        var bottomEdge = topEdge + 32;
        var edge = (direction === 'up') ? topEdge : bottomEdge;
        if (lastNodeEdge !== null && (entry.group !== lastNodeGroup)) {
          if (edge === lastNodeEdge) {
            entry.group.touches = entry.group.touches || new Set();
            entry.group.touches.add(lastNodeGroup);
          }
        }
        lastNodeEdge = (direction === 'up') ? bottomEdge : topEdge;
        lastNodeGroup = entry.group;
      }
    }
  }

  var sourceGroups = groups.filter(group => { for (const node of group) if (sourceNodes.has(node)) return true; });
  var visitedGroups = new Set();
  var groupsToVisit = new Set(sourceGroups);
  while (groupsToVisit.size > 0) {
    var group = groupsToVisit.values().next().value;
    groupsToVisit.delete(group);
    visitedGroups.add(group);
    if (group.touches) {
      for (const touchingGroup of group.touches) {
        if (!visitedGroups.has(touchingGroup)) {
          groupsToVisit.add(touchingGroup);
        }
      }
    }
  }
  return visitedGroups;
}

function doGroupsTouch(groupA, groupB, direction) {
  if (direction === 'left'/* || direction === 'right'*/) {
    var groupAMinY = Math.min(...[...groupA].map(node => parseInt(node.style.top)));
    var groupAMaxY = Math.max(...[...groupA].map(node => parseInt(node.style.top) + 32));

    var groupBMinY = Math.min(...[...groupB].map(node => parseInt(node.style.top)));
    var groupBMaxY = Math.max(...[...groupB].map(node => parseInt(node.style.top) + 32));

    if ((groupAMinY > groupBMaxY) || (groupAMaxY < groupBMinY)) {
      return false;
    }

    var minY = Math.min(groupAMinY, groupBMinY);
    var maxY = Math.max(groupAMaxY, groupBMaxY);
    var rowCount = (maxY - minY) / 32;
    var rows = [];

    for (let node of groupA) {
      var nodeY = parseInt(node.style.top);
      var row = (nodeY - minY) / 32;
      rows[row] = rows[row] || [];
      rows[row].push({group: 'a', node: node});
    }
    for (let node of groupB) {
      var nodeY = parseInt(node.style.top);
      var row = (nodeY - minY) / 32;
      rows[row] = rows[row] || [];
      rows[row].push({group: 'b', node: node});
    }

    for (let row of rows) {
      if (!row) {
        continue;
      }
      row.sort((a,b) => parseInt(a.node.style.left) - parseInt(b.node.style.left));
      var lastNodeEdge = null;
      var lastNodeGroup = null;
      for (let entry of row) {
        var leftEdge = parseInt(entry.node.style.left);
        var rightEdge = leftEdge + parseInt(entry.node.style.width);
        if (lastNodeEdge !== null && (entry.group !== lastNodeGroup) && ((leftEdge - lastNodeEdge) < 20)) {
          return true;
        }
        lastNodeEdge = rightEdge;
        lastNodeGroup = entry.group;
      }
    }
  }
  return false;
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
  for (let node of [...currentSurface.getElementsByClassName('node')]) {
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
  for (let node of currentSurface.getElementsByClassName('node')) {
    node.classList.add('selected');
  }
  selectionBox.classList.add('hidden');
}

function deselectAll() {
  for (let element of [...currentSurface.getElementsByClassName('selected')]) {
    element.classList.remove('selected');
  }
  selectionBox.classList.add('hidden');
}

var lastFocusedNodeOriginalName = null;
if (getNodeAtCursor() !== null) {
  lastFocusedNodeOriginalName = getNodeAtCursor().value;
}

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
      for (let node of mainSurface.getElementsByClassName('node')) {
        if (node != event.target && node.value.startsWith(event.target.value)) {
          ids.set(node.dataset.id, node.value);
        }
      }
      for (let entry of builtinNameMatches) {
        if (entry.name.startsWith(event.target.value)) {
          ids.set(entry.id, entry.name);
        }
      }
      if (ids.size > 0) {
        for (let [id, name] of ids) {
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
  var instances = [...document.querySelectorAll(`[data-id="${node.dataset.id}"]`)];
  for (let instance of instances) {
    instance.value = name;
    instance.setAttribute('value', name);
    var width = (Math.ceil(((name.length * 8) + 5) / 64) * 64) - 14;
    if (parseInt(instance.style.width) !== width) {
      instance.style.width = width + 'px';
      for (let link of node.links) layoutLink(link);
    }
  }
}

function moveNodesToPosition(nodes, position) {
  var leftmost = Math.min(...nodes.map(node => parseInt(node.style.left)));
  var topmost  = Math.min(...nodes.map(node => parseInt(node.style.top)));
  var deltaX = pxToGridX(parseInt(position.x)) - leftmost;
  var deltaY = pxToGridY(parseInt(position.y)) - topmost;
  var affectedLinks = new Set();
  for (let node of nodes) {
    node.style.left = (parseInt(node.style.left) + deltaX) + 'px';
    node.style.top  = (parseInt(node.style.top)  + deltaY) + 'px';
    for (let link of node.links) affectedLinks.add(link);
  }
  for (let link of affectedLinks) layoutLink(link);
}

function makeNodeAtCursorUnique() {
  var node = getNodeAtCursor();
  if (!node) {
    return;
  }
  var oldId = node.dataset.id;
  var newId = makeUuid();
  node.setAttribute('data-id', newId);
  evaluateCursorPosition();
  recordAction(new changeIdAction(node, {id: oldId}, {id: newId}));
}

function isolateSelection() {
  var selectedNodes = new Set(currentSurface.querySelectorAll('.node.selected'));
  var linksToDelete = new Set();
  for (let node of selectedNodes) {
    for (let link of node.links) {
      if (!selectedNodes.has(link.from) ||
          !selectedNodes.has(link.via) ||
          !selectedNodes.has(link.to)) {
        linksToDelete.add(link);
      }
    }
  }
  if (linksToDelete.size > 0) {
    deleteElements([...linksToDelete]);
    recordAction(new deleteElementsAction([...linksToDelete]));
  }
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
        for (let node of document.querySelectorAll(`.node[data-id='${selectedMatch.dataset.id}']`)) {
          node.classList.remove('name-match-selected');
        }
        otherMatch.classList.add('selected');
        for (let node of document.querySelectorAll(`.node[data-id='${otherMatch.dataset.id}']`)) {
          node.classList.add('name-match-selected');
        }
      }
    } else {
      matches[0].classList.add('selected');
      for (let node of document.querySelectorAll(`.node[data-id='${matches[0].dataset.id}']`)) {
        node.classList.add('name-match-selected');
      }
    }
  }
}

function applyCurrentNameMatchSelection(nameMatch) {
  nameMatch = nameMatch || nameMatchPanel.getElementsByClassName('selected')[0];
  var node = getNodeAtCursor();
  if (node.dataset.id !== nameMatch.dataset.id) {
    var oldId = node.dataset.id;
    var oldName = node.value;
    node.setAttribute('data-id', nameMatch.dataset.id);
    setNodeName(node, nameMatch.textContent);
    lastFocusedNodeOriginalName = nameMatch.textContent;
    recordAction(new changeIdAction(node, {id: oldId, name: oldName}, {id: nameMatch.dataset.id, name: nameMatch.textContent}));
  }
  nameMatchPanel.remove();
  resetCursorBlink();
  for (let otherNode of document.getElementsByClassName('node')) {
    otherNode.classList.remove('name-match-selected');
    otherNode.classList.toggle('cursor-at-instance', otherNode.dataset.id === nameMatch.dataset.id);
  }
}

nameMatchPanel.addEventListener('click', event => {
  if (event.target.classList.contains('name-match')) {
    applyCurrentNameMatchSelection(event.target);
  }
});

function closeNameMatchPanel() {
  nameMatchPanel.remove();
  for (let node of [...document.getElementsByClassName('name-match-selected')]) {
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
    for (let node of nodes) {
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
  var allLinks = [...surface.getElementsByClassName('link')].filter(link => link.from && link.via && link.to);
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

for (let panelContainer of document.getElementsByClassName('panels-container')) {
  for (let panelHeader of panelContainer.querySelectorAll('.headers button')) {
    panelHeader.addEventListener('click', event => {
      if (!panelContainer.dataset.panel || panelContainer.dataset.panel !== panelHeader.dataset.panel) {
        panelContainer.dataset.panel = panelHeader.dataset.panel;
        panelContainer.classList.add('expanded');
      } else {
        panelContainer.dataset.panel = '';
        panelContainer.classList.remove('expanded');
      }
//       let panels = panelContainer.querySelectorAll('.panel');
//       for (let panel of panels) {
//         let isClickedPanel = panel.dataset.panel === panelHeader.dataset.panel;
//         if (isClickedPanel) {
//           panel.classList.toggle('expanded');
//           panelContainer.querySelector(`.headers [data-panel='${panel.dataset.panel}']`).classList.toggle('expanded');
//         } else {
//           panel.classList.toggle('expanded', isClickedPanel);
//           panelContainer.querySelector(`.headers [data-panel='${panel.dataset.panel}']`).classList.toggle('expanded', isClickedPanel);
//         }
//       }
    });
  }
}


// Find panel

var findPanel = document.querySelectorAll('.panel[data-panel="find"]')[0];

function testNodesFindMatch(findNode, targetNode) {
  return !findNode.value ||
         findNode.value === '*' ||
         targetNode.dataset.id === findNode.dataset.id ||
         (findNode.value === '$' && (targetNode.classList.contains('selected') || (targetNode === getNodeAtCursor(mainSurface))));
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
    for (let link of mainSurface.getElementsByClassName('link')) {
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
    for (let connectedLink of connectedLinks) {
      correspondences = correspondences.filter(correspondence => {
        var hasMatchingLink = false;
        for (let link of mainSurface.getElementsByClassName('link')) {
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
    for (let correspondence of correspondences) {
      correspondence.forEach((queryNode, targetNode) => {
        if (queryNode.value === '*') {
          var instances = mainSurface.querySelectorAll(`.node[data-id='${targetNode.dataset.id}']`);
          for (let instance of instances) queryResult.add(instance);
        }
      });
    }
    return queryResult;
  }
}
function openFindPanel() {
  bottomPanelContainer.dataset.panel = 'find';
  bottomPanelContainer.classList.add('expanded');
  var findPanelNodes = findPanel.getElementsByClassName('nodes')[0];
  if (findPanelNodes.getElementsByClassName('node').length === 0) {
    createNode({position: {x: 0, y: 0}, parent: findPanelNodes});
  } else {
    highlightQueriedNodes();
  }
  setCurrentSurface(findPanel);
  resetCursorBlink();
  var nodeUnderCursor = getNodeAtCursor();
  if (nodeUnderCursor) {
    nodeUnderCursor.focus();
  }
}
function highlightQueriedNodes() {
  var queriedNodes = getQueriedNodes();
  for (let node of mainSurface.getElementsByClassName('node')) {
    node.classList.toggle('highlighted', queriedNodes.has(node));
  }
}
function moveSelectionToQueriedNodes() {
  var queriedNodes = getQueriedNodes();
  for (let node of mainSurface.getElementsByClassName('node')) {
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
  var nodeUnderCursor = getNodeAtCursor();
  if (nodeUnderCursor) {
    nodesToMove.add(nodeUnderCursor);
  }
  if (nodesToMove.size === 0) return;

  var affectedLinks = new Set();

  var groups = getNodeGroups();

  var selectedGroups = groups.filter(group => [...group].some(node => node.classList.contains('selected') || document.activeElement === node));
  var selectedGroupsNodes = [];
  for (const group of selectedGroups) {
    selectedGroupsNodes.push(...group);
  }
  var touchingNodes = getTouchingNodesInDirection(nodesToMove, direction, selectedGroupsNodes);
  for (const node of touchingNodes) {
    nodesToMove.add(node);
  }

  var unselectedGroups = groups.filter(group => [...group].every(node => !node.classList.contains('selected') && document.activeElement !== node));
  for (const group of selectedGroups) {
    var newGroup = new Set();
    for (const node of group) {
      if (node.classList.contains('selected') || document.activeElement === node) {
        newGroup.add(node);
      }
    }
    unselectedGroups.push(newGroup);
  }

  var touchingGroups = getTouchingGroupsInDirection(nodesToMove, direction, unselectedGroups);
  for (const group of touchingGroups) {
    if ([...group].every(node => !nodesToMove.has(node))) {
      for (const node of group) {
        nodesToMove.add(node);
      }
    }
  }
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

  for (let node of nodesToMove) {
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
  let node = getNodeAtCursor();
  if (!node) {
    return;
  }

  if (getAdjacentNodesInDirection(node, direction).length !== 0) {
    return;
  }

  var instance = document.createElement('input');
  instance.classList.add('node');
  instance.setAttribute('data-id', node.dataset.id);
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
  currentSurface.getElementsByClassName('nodes')[0].appendChild(instance);

  setCursorPosition({x: parseInt(instance.style.left), y: parseInt(instance.style.top)});

  recordAction(new createElementsAction([instance]));
}

function selectNameMatchOrInsertNodeDown() {
  if (nameMatchPanel.parentElement) {
    applyCurrentNameMatchSelection();
  } else {
    insertNodeAtCursor({moveAdjacent: 'down' });
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
    for (let node of adjacentNodes) {
      node.style.left = (parseInt(node.style.left) + offsetX) + 'px';
      node.style.top  = (parseInt(node.style.top)  + offsetY) + 'px';
      for (let link of node.links) affectedLinks.add(link);
    }
    for (let link of affectedLinks) layoutLink(link);
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
  if (currentSurface === mainSurface && (cursorX <= 0 || cursorY <= 0)) {
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
    setSelectionBox(getBoundingBoxForPoints(selectionBox.anchorPosition, {x: cursorX, y: cursorY}));
    selectionBox.classList.remove('hidden');
  } else {
    deselectAll();
  }
  setCursorPosition({x: cursorX, y: cursorY});
  var nodeUnderCursor = getNodeAtCursor();
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
  mainSurface.scrollBy(scrollDelta.x, scrollDelta.y);
  resetCursorBlink();
}

function getConnectedNodes(node) {
  var connectedNodes = new Set();
  var nodesToVisit = [node];
  while (nodesToVisit.length > 0) {
    var node = nodesToVisit.pop();
    connectedNodes.add(node);
    for (let link of node.links) {
      if (!connectedNodes.has(link.from)) nodesToVisit.push(link.from);
      if (!connectedNodes.has(link.via))  nodesToVisit.push(link.via);
      if (!connectedNodes.has(link.to))   nodesToVisit.push(link.to);
    }
  }
  return [...connectedNodes];
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

function selectConnectedNodesAtCursor() {
  var nodeAtCursor = getNodeAtCursor();
  if (nodeAtCursor) {
    deselectAll();
    for (let node of getConnectedNodes(nodeAtCursor)) {
      node.classList.add('selected');
    }
  }
}

function selectInstancesOfNodeAtCursor(options) {
  options = options || {};
  var nodeAtCursor = getNodeAtCursor();
  if (nodeAtCursor) {
    deselectAll();
    var nodes = options.onlyConnectedNodes ?
      getConnectedNodes(nodeAtCursor).filter(connectedNode => connectedNode.dataset.id === nodeAtCursor.dataset.id)
      :
      currentSurface.querySelectorAll(`.node[data-id='${nodeAtCursor.dataset.id}']`);
    for (let node of nodes) {
      node.classList.add('selected');
    }
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
    for (let anchor of anchorPoints) {
      anchor.distance = Math.pow(nextPoint.x - anchor.point.x, 2) + Math.pow(nextPoint.y - anchor.point.y, 2);
    }
    anchorPoints.sort((a, b) => a.distance - b.distance);
    points.push(anchorPoints[0].point);
  }
  if (link.via)  points.push(getNodeCenter(link.via));
  if (link.to) {
    var viaPoint = getNodeCenter(link.via);
    var anchorPoints = getNodeAnchorPoints(link.to);
    for (let anchor of anchorPoints) {
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
  for (let link of links) {
    link.from = document.getElementById(link.dataset.from);
    link.via  = document.getElementById(link.dataset.via);
    link.to   = document.getElementById(link.dataset.to);
  }
  for (let node of nodes) {
    var linksList = node.getAttribute('data-links');
    if (linksList) {
      node.links = new Set(linksList.split(',').map(id => document.getElementById(id)));
    } else {
      node.links = new Set();
    }
  }
}

function clearSerialization(nodes, links) {
  for (let link of links) {
    link.removeAttribute('id');
    link.removeAttribute('data-from');
    link.removeAttribute('data-via');
    link.removeAttribute('data-to');
  }
  for (let node of nodes) {
    node.removeAttribute('id');
    node.removeAttribute('data-links');
    node.removeAttribute('data-instances')
  }
}

function getNodesAndLinksAsHtml(nodes, links) {
  var nodes = nodes || [...mainSurface.getElementsByClassName('node')];
  var links = links || [...mainSurface.getElementsByClassName('link')];

  var classes = new Map();
  for (let node of nodes) {
    classes.set(node, node.className);
    node.className = 'node';
  }
  for (let link of links) {
    classes.set(link, link.className.baseVal);
    link.className.baseVal = 'link';
  }

  var id = 0;
  var nodesSet = new Set(nodes);
  var linksSet = new Set(links);
  for (let node of nodes) node.id = id++;
  for (let link of links) {
    link.id = id++;
    link.setAttribute('data-from', link.from.id);
    link.setAttribute('data-via',  link.via.id);
    link.setAttribute('data-to',   link.to.id);
  }
  for (let node of nodes) {
    if (node.links.size > 0) {
      node.setAttribute('data-links', [...node.links].filter(link => linksSet.has(link)).map(link => link.id).join(','));
    }
  }

  var html = '<div class="nodes">' + [...nodes].map(node => node.outerHTML).join('') + '</div>' +
             '<svg class="links">' + [...links].map(link => link.outerHTML).join('') + '</svg>';

  clearSerialization(nodes, links);

  for (let [element, className] of classes) {
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
  for (let node of nodes) currentSurface.getElementsByClassName('nodes')[0].appendChild(node);
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
  for (let node of nodes) {
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

function saveToLocalStorage() {
  localStorage.saved_state = getNodesAndLinksAsHtml();
  if (actions.length > 0) {
    savedAction = actions[actions.length-1];
  } else {
    savedAction = null;
  }
}

function download() {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(getNodesAndLinksAsHtml()));
  element.setAttribute('download', '');
  element.style.display = 'none';

  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
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
