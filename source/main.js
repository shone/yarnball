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

const queryParams = new URLSearchParams(location.search.substring(1));
const path = queryParams.get('path');
async function load() {
  if (path) {
    window.resizeTo(640, 480);
    const pathParts = path.split('/');
    document.title = pathParts[pathParts.length-1] + ' — Yarnball';
    const response = await fetch(location.origin + '/load?path=' + path);
    const text = await response.text();
    if (response.ok) {
      insertNodesAndLinksFromHtml(text);
    } else {
      alert(response.statusText + ' - ' + text);
    }
  } else if (localStorage.saved_state) {
    insertNodesAndLinksFromHtml(localStorage.saved_state);
  }
}
load();

const bottomPanelContainer = document.querySelectorAll('.panels-container.bottom')[0];

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

  const nodeUnderCursor = getNodeAtCursor();

  // Highlighting
  for (const element of [...currentSurface.getElementsByClassName('highlight-for-connected')]) {
    element.classList.remove('highlight-for-connected');
  }
  if (nodeUnderCursor) {
    const nodesToHighlight = new Set();
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
  const nodeAtCursor = getNodeAtCursor();
  if (nodeAtCursor) {
    nodeAtCursor.focus();
    nodeAtCursor.select();
  }
  for (const node of document.getElementsByClassName('node')) {
    const atInstance = nodeAtCursor && node.dataset.id === nodeAtCursor.dataset.id;
    node.classList.toggle('cursor-at-instance', atInstance);
    if (node.overflowMap) {
      for (const nodeShadow of Object.values(node.overflowMap)) {
        nodeShadow.classList.toggle('cursor-at-instance', atInstance);
      }
    }
  }
  document.dispatchEvent(new Event('cursorPositionEvaluated'));
}
function resetCursorBlink() {
  cursor.classList.remove('blinking');
  cursor.offsetHeight;
  cursor.classList.add('blinking');
}
function getNodeAtCursor(surface = currentSurface) {
  const cursor_ = surface.getElementsByClassName('cursor')[0];
  return getNodeAtPosition({x: parseInt(cursor_.style.left), y: parseInt(cursor_.style.top)}, surface);
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
  const left   = Math.min(pointA.x, pointB.x);
  const top    = Math.min(pointA.y, pointB.y);
  const right  = Math.max(pointA.x, pointB.x);
  const bottom = Math.max(pointA.y, pointB.y);
  const width  = right - left;
  const height = bottom - top;
  return {left, top, right, bottom, width, height};
}

function getNodeAtPosition(position, surface = currentSurface) {
  for (let node of surface.getElementsByClassName('node')) {
    if ((position.y === parseInt(node.style.top)) &&
      (position.x >= parseInt(node.style.left)) && (position.x < (parseInt(node.style.left) + parseInt(node.style.width)))) {
      return node;
    }
  }
  return null;
}

function getNodeClosestToPosition(position, surface = currentSurface) {
  let closestNode = null;
  let closestDistance = null;
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

const pxToGridX = px => Math.round(px / 64) * 64;
const pxToGridY = px => Math.round(px / 32) * 32;



function makeUuid() {
  const uints = window.crypto.getRandomValues(new Uint8Array(16));
  return Array.prototype.map.call(uints, i => ('00' + i.toString(16)).slice(-2)).join('');
}

function createNode(options = {}) {
  const node = document.createElement('input');
  node.classList.add('node');
  node.setAttribute('data-id', makeUuid());
  if (options.text) node.value = text;
  if (options.position) {
    node.style.left = String(options.position.x) + 'px';
    node.style.top  = String(options.position.y) + 'px';
  } else {
    node.style.left = '0px';
    node.style.top  = '0px';
  }
  node.style.width = '50px';
  node.links = new Set();
  if (options.parent) {
    options.parent.appendChild(node);
  } else {
    currentSurface.getElementsByClassName('nodes')[0].appendChild(node);
  }
  return node;
}

function createLink(options = {}) {
  const link = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  currentSurface.getElementsByClassName('links')[0].appendChild(link);
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
  if (options.from && options.via && options.to) {
    link.classList.add('link');
  } else {
    link.classList.add('unfinished-link');
  }
  return link;
}

var linkBeingCreated = null;
function useNodeForLinkCreationMode(node) {
  if (linkBeingCreated) {
    if (!linkBeingCreated.from) {
      linkBeingCreated.from = node;
    } else if (!linkBeingCreated.via) {
      if (linkBeingCreated.from === node) return;
      linkBeingCreated.via = node;
      layoutLink(linkBeingCreated, {x: parseInt(cursor.style.left) + 32, y: parseInt(cursor.style.top) + 32});
    } else if (!linkBeingCreated.to) {
      if (linkBeingCreated.from === node || linkBeingCreated.via === node) return;
      const existingLink = [...currentSurface.getElementsByClassName('link')].find(link => {
        return link.from === linkBeingCreated.from &&
               link.via  === linkBeingCreated.via  &&
               link.to   === node;
      });
      if (existingLink) {
        deleteElements([existingLink]);
        linkBeingCreated.remove();
        recordAction(new deleteElementsAction([existingLink]));
      } else {
        linkBeingCreated.to = node;
        linkBeingCreated.from.links.add(linkBeingCreated);
        linkBeingCreated.via.links.add(linkBeingCreated);
        linkBeingCreated.to.links.add(linkBeingCreated);
        linkBeingCreated.classList.add('link');
        linkBeingCreated.classList.remove('unfinished-link');
        layoutLink(linkBeingCreated);
      }
      const createdLink = linkBeingCreated;
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
    linkBeingCreated.remove();
    linkBeingCreated = null;
  }
  cursor.classList.remove('insert-mode');
  resetCursorBlink();
}

function deleteElements(elements) {
  const affectedLinks = new Set();
  for (const element of elements) {
    if (element.classList.contains('node')) {
      for (const link of element.links) affectedLinks.add(link);
      if (linkBeingCreated) {
        if (linkBeingCreated.from === element || linkBeingCreated.via === element) {
          cancelLinkMode();
        }
      }
      element.remove();
    } else if (element.classList.contains('link')) {
      affectedLinks.add(element);
    }
  }
  for (const link of affectedLinks) {
    link.from.links.delete(link);
    link.via.links.delete(link);
    link.to.links.delete(link);
    link.remove();
  }
  evaluateCursorPosition();
  return affectedLinks;
}

function deleteSelection() {
  const elementsToDelete = new Set(currentSurface.getElementsByClassName('selected'));
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
    for (const highlighted of [...mainSurface.getElementsByClassName('highlighted')]) {
      highlighted.classList.remove('highlighted');
      if (highlighted.overflowMap) {
        for (const nodeShadow of Object.values(highlighted.overflowMap)) {
          nodeShadow.classList.remove('highlighted');
        }
      }
    }
    setCurrentSurface(mainSurface);
    return;
  }
}

function selectionToClipboard(options = {}) {
  const selectedNodes = new Set([...currentSurface.querySelectorAll('.node.selected')]);
  if (document.activeElement && document.activeElement.classList.contains('node')) {
    selectedNodes.add(document.activeElement);
  }
  if (selectedNodes.size === 0) return;
  const affectedLinks = new Set();
  for (let node of selectedNodes) {
    for (let link of node.links) {
      if (
        selectedNodes.has(link.from) &&
        selectedNodes.has(link.via)  &&
        selectedNodes.has(link.to)
      ) affectedLinks.add(link);
    }
  }
  const html = getNodesAndLinksAsHtml(selectedNodes, affectedLinks);
  const previouslyFocusedElement = document.activeElement;
  const temporaryInput = document.createElement('input');
  temporaryInput.value = html;
  document.body.appendChild(temporaryInput);
  temporaryInput.select();
  document.execCommand('copy');
  temporaryInput.remove();
  if (options.cut) {
    // Don't delete nodes that have links to unselected nodes
    const nodesToDelete = new Set([...selectedNodes].filter(node =>
      [...node.links].every(link =>
        selectedNodes.has(link.from) &&
        selectedNodes.has(link.via)  &&
        selectedNodes.has(link.to)
      )
    ));
    if (nodesToDelete.size > 0 || affectedLinks.size > 0) {
      const elements = [...nodesToDelete, ...affectedLinks];
      deleteElements(elements);
      recordAction(new deleteElementsAction(elements));
    }
    selectionBox.classList.add('hidden');
  } else if (previouslyFocusedElement) {
    previouslyFocusedElement.focus();
  }
}

function getClosestNodeTo(position, nodes = currentSurface.getElementsByClassName('node')) {
  let closestNode = null;
  let closestNodeDistance = null;
  for (let node of nodes) {
    const nodePosition = { x: parseInt(node.style.left),   y: parseInt(node.style.top)    };
    const delta        = { x: position.x - nodePosition.x, y: position.y - nodePosition.y };
    const distance = (delta.x * delta.x) + (delta.y * delta.y);
    if (!closestNode || distance < closestNodeDistance) {
      closestNode = node;
      closestNodeDistance = distance;
    }
  }
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
    const rows = getNodesOrganizedIntoRows(nodes);
    const touchingNodes = [];
    for (const row of rows) {
      if (!row) {
        continue;
      }
      if (direction === 'left') {
        row.sort((a,b) => parseInt(a.style.left) - parseInt(b.style.left));
      } else if (direction === 'right') {
        row.sort((a,b) => parseInt(b.style.left) - parseInt(a.style.left));
      }
      let lastNodeEdge = null;
      let lastNodeWasSourceNode = null;
      let currentBlock = [];
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
    const touchingNodes = new Set();
    const columns = getNodesOrganizedIntoColumns(nodes);
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
    const maxY = Math.max(...columns.filter(column => column).map(column => parseInt((direction === 'down' ? column[column.length-1] : column[0]).style.top)));
    const rowCount = (maxY + 32) / 32;
    for (let row = 0; row < rowCount; row++) {
      const normalizedRow = direction === 'down' ? row : (rowCount - row);
      const rowPx = (normalizedRow * 32) + 'px';
      for (const column of columns) {
        if (!column) {
          continue;
        }
        const nodeIndex = column.findIndex(node => node.style.top === rowPx);
        if (nodeIndex >= 1) {
          const node     = column[nodeIndex];
          const prevNode = column[nodeIndex-1];
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
  const visitedNodes = new Set();
  const groups = [];
  for (const node of [...currentSurface.getElementsByClassName('node')]) {
    if (!visitedNodes.has(node)) {
      const group = new Set();
      const nodesToVisit = new Set([node]);
      while (nodesToVisit.size > 0) {
        const visitingNode = nodesToVisit.values().next().value;
        nodesToVisit.delete(visitingNode);
        group.add(visitingNode);
        visitedNodes.add(visitingNode);
        for (let link of visitingNode.links) {
          if (!group.has(link.from)) nodesToVisit.add(link.from);
          if (!group.has(link.via))  nodesToVisit.add(link.via);
          if (!group.has(link.to))   nodesToVisit.add(link.to);
        }
      }
      groups.push(group);
    }
  }
  return groups;
}

function getGroupsOrganizedIntoRows(groups) {
  const rows = [];
  for (const group of groups) {
    for (const node of group) {
      const nodeY = parseInt(node.style.top);
      const row = nodeY / 32;
      rows[row] = rows[row] || [];
      rows[row].push({group, node});
    }
  }
  return rows;
}

function getGroupsOrganizedIntoColumns(groups) {
  const columns = [];
  for (const group of groups) {
    for (const node of group) {
      const nodeX = parseInt(node.style.left);
      const nodeWidth = parseInt(node.style.width);
      const column = nodeX / 64;
      const columnCount = pxToGridX(nodeWidth) / 64;
      for (let c=0; c < columnCount; c++) {
        columns[column+c] = columns[column+c] || [];
        columns[column+c].push({group, node});
      }
    }
  }
  return columns;
}

function getTouchingGroupsInDirection(sourceNodes, direction, groups = getNodeGroups()) {
  if (direction === 'left' || direction === 'right') {
    const rows = getGroupsOrganizedIntoRows(groups);

    for (const row of rows) {
      if (!row) {
        continue;
      }
      if (direction === 'left') {
        row.sort((a,b) => parseInt(a.node.style.left) - parseInt(b.node.style.left));
      } else if (direction === 'right') {
        row.sort((a,b) => parseInt(b.node.style.left) - parseInt(a.node.style.left));
      }
      let lastNodeEdge = null;
      let lastNodeGroup = null;
      for (const entry of row) {
        const leftEdge = parseInt(entry.node.style.left);
        const rightEdge = leftEdge + parseInt(entry.node.style.width);
        const edge = (direction === 'left') ? leftEdge : rightEdge;
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
    const columns = getGroupsOrganizedIntoColumns(groups);

    for (const column of columns) {
      if (!column) {
        continue;
      }
      if (direction === 'up') {
        column.sort((a,b) => parseInt(a.node.style.top) - parseInt(b.node.style.top));
      } else if (direction === 'down') {
        column.sort((a,b) => parseInt(b.node.style.top) - parseInt(a.node.style.top));
      }
      let lastNodeEdge = null;
      let lastNodeGroup = null;
      for (const entry of column) {
        const topEdge = parseInt(entry.node.style.top);
        const bottomEdge = topEdge + 32;
        const edge = (direction === 'up') ? topEdge : bottomEdge;
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

  const sourceGroups = groups.filter(group => { for (const node of group) if (sourceNodes.has(node)) return true; });
  const visitedGroups = new Set();
  const groupsToVisit = new Set(sourceGroups);
  while (groupsToVisit.size > 0) {
    const group = groupsToVisit.values().next().value;
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

function getNodesIntersectingBox(box, nodes = [...currentSurface.getElementsByClassName('node')]) {
  return nodes.filter(node => {
    return !(
      ((parseInt(node.style.left) + getNodeWidthForName(node.value))  <  box.left)  ||
       (parseInt(node.style.left)                                     >= box.right) ||
      ((parseInt(node.style.top)  + 20)                               <  box.top)   ||
       (parseInt(node.style.top)                                      >= box.bottom)
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
  const intersectingNodes = new Set(getNodesIntersectingBox(position));
  for (const node of [...currentSurface.getElementsByClassName('node')]) {
    if (selectedNodesToPreserve && selectedNodesToPreserve.has(node)) continue;
    const selected = intersectingNodes.has(node);
    node.classList.toggle('selected', selected);
    if (node.overflowMap) {
      for (const nodeShadow of Object.values(node.overflowMap)) {
        nodeShadow.classList.toggle('selected', selected);
      }
    }
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
  for (const node of [...currentSurface.getElementsByClassName('node')]) {
    node.classList.add('selected');
  }
  const surfaceContainer = currentSurface.closest('.surface-container');
  if (surfaceContainer) {
    for (const nodeShadow of [...surfaceContainer.getElementsByClassName('node-shadow')]) {
      nodeShadow.classList.add('selected');
    }
  }
  selectionBox.classList.add('hidden');
}

function deselectAll() {
  for (const element of [...currentSurface.getElementsByClassName('selected')]) {
    element.classList.remove('selected');
    if (element.overflowMap) {
      for (const nodeShadow of Object.values(element.overflowMap)) {
        nodeShadow.classList.remove('selected');
      }
    }
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
    const node = event.target;
    setNodeName(node, node.value);
    while (nameMatchPanel.firstChild) nameMatchPanel.removeChild(nameMatchPanel.firstChild);
    if (event.target.value !== '') {
      const ids = new Map();
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
          const match = document.createElement('div');
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

function getNodeWidthForName(name) {
  const characterWidth = 6.02;
  const padding = 5;
  const stringWidth = padding + (name.length * characterWidth);
  if (stringWidth <= 50) {
    return 50;
  } else if (stringWidth <= 114) {
    return 114;
  } else {
    return 114 + (Math.ceil((stringWidth - 114) / 64) * 64);
  }
}

function setNodeName(node, name) {
  const instances = [...document.querySelectorAll(`[data-id="${node.dataset.id}"]`)];
  const width = getNodeWidthForName(name);
  for (const instance of instances) {
    instance.value = name;
    instance.setAttribute('value', name);
    if (parseInt(instance.style.width) !== width) {
      instance.style.width = width + 'px';
      for (const link of node.links) layoutLink(link);
    }
  }
  if (node.closest('[data-panel="find"]')) {
    highlightQueriedNodes();
  }
}

function makeNodeAtCursorUnique() {
  const node = getNodeAtCursor();
  if (!node) {
    return;
  }
  const oldId = node.dataset.id;
  const newId = makeUuid();
  node.dataset.id = newId;
  evaluateCursorPosition();
  recordAction(new changeIdAction(node, {id: oldId}, {id: newId}));
}

function isolateSelection() {
  const selectedNodes = new Set(currentSurface.querySelectorAll('.node.selected'));
  const linksToDelete = new Set();
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

const nameMatchPanel = document.getElementById('name-match-panel');

const builtinNameMatches = [];

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

function applyCurrentNameMatchSelection(nameMatch = nameMatchPanel.getElementsByClassName('selected')[0]) {
  if (!nameMatch) {
    return;
  }
  const node = getNodeAtCursor();
  if (node.dataset.id !== nameMatch.dataset.id) {
    const oldId = node.dataset.id;
    const oldName = node.value;
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
  const item = event.clipboardData.items[0];
  if (item.kind !== 'string') return;
  item.getAsString(string => {
    const inserted = insertNodesAndLinksFromHtml(string, {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)});
    evaluateCursorPosition();
    const selectionBox = getSelectionBox();
    recordAction(
      new pasteElementsAction(inserted.nodes, inserted.links),
      {
        selectionBox: {before: selectionBox, after: null},
      }
    );
    for (const node of inserted.nodes) {
      node.classList.add('selected');
      if (node.overflowMap) {
        for (const nodeShadow of Object.values(node.overflowMap)) {
          nodeShadow.classList.add('selected');
        }
      }
    }
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
        evaluateCursorPosition();
      } else {
        panelContainer.dataset.panel = '';
        panelContainer.classList.remove('expanded');
      }
    });
  }
}


// Find panel

const findPanel = document.querySelectorAll('.panel[data-panel="find"]')[0];

function testNodesFindMatch(findNode, targetNode) {
  return !findNode.value ||
         findNode.value === '*' ||
         targetNode.dataset.id === findNode.dataset.id ||
         (findNode.value === '$' && (targetNode.classList.contains('selected') || (targetNode === getNodeAtCursor(mainSurface))));
}
function getQueriedNodes() {
  const findPanelNodes = [...findPanel.getElementsByClassName('node')];
  if (findPanelNodes.length === 1) {
    if (findPanelNodes[0].value) {
      return new Set([...mainSurface.getElementsByClassName('node')].filter(node => testNodesFindMatch(findPanelNodes[0], node)));
    } else {
      return new Set();
    }
  } else {
    const findPanelLinks = [...findPanel.getElementsByClassName('link')].filter(link => link.from && link.via && link.to);
    if (findPanelLinks.length === 0) return new Set();

    const findLink = findPanelLinks[0];
    let correspondences = [];
    for (let link of mainSurface.getElementsByClassName('link')) {
      const match = testNodesFindMatch(findLink.from, link.from) &&
                    testNodesFindMatch(findLink.via,  link.via)  &&
                    testNodesFindMatch(findLink.to,   link.to);
      if (match) {
        const correspondence = new Map();
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
    const queryResult = new Set();
    for (let correspondence of correspondences) {
      correspondence.forEach((queryNode, targetNode) => {
        if (queryNode.value === '*') {
          const instances = mainSurface.querySelectorAll(`.node[data-id='${targetNode.dataset.id}']`);
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
  const findPanelNodes = findPanel.getElementsByClassName('nodes')[0];
  if (findPanelNodes.getElementsByClassName('node').length === 0) {
    createNode({position: {x: 0, y: 0}, parent: findPanelNodes});
  } else {
    highlightQueriedNodes();
  }
  setCurrentSurface(findPanel);
  resetCursorBlink();
  const nodeUnderCursor = getNodeAtCursor();
  if (nodeUnderCursor) {
    nodeUnderCursor.focus();
  }
}
function highlightQueriedNodes() {
  const queriedNodes = getQueriedNodes();
  for (const node of mainSurface.getElementsByClassName('node')) {
    const highlighted = queriedNodes.has(node);
    node.classList.toggle('highlighted', highlighted);
    if (node.overflowMap) {
      for (const nodeShadow of Object.values(node.overflowMap)) {
        nodeShadow.classList.toggle('highlighted', highlighted);
      }
    }
  }
}
function moveSelectionToQueriedNodes() {
  const queriedNodes = getQueriedNodes();
  for (const node of mainSurface.getElementsByClassName('node')) {
    const selected    = queriedNodes.has(node);
    const highlighted = queriedNodes.has(node) || (event.shiftKey && node.classList.contains('selected'));
    node.classList.toggle('highlighted', selected);
    node.classList.toggle('selected',    highlighted);
    if (node.overflowMap) {
      for (const nodeShadow of Object.values(node.overflowMap)) {
        nodeShadow.classList.toggle('selected', selected);
        nodeShadow.classList.toggle('highlighted', highlighted);
      }
    }
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
  let nodesToMove = new Set(currentSurface.querySelectorAll('.node.selected'));
  const nodeAtCursor = getNodeAtCursor();
  if (nodeAtCursor) {
    nodesToMove.add(nodeAtCursor);
  }
  if (nodesToMove.size === 0) return;

  const affectedLinks = new Set();

  const groups = getNodeGroups();

  const selectedGroups = groups.filter(group => [...group].some(node => node.classList.contains('selected') || document.activeElement === node));
  const selectedGroupsNodes = [];
  for (const group of selectedGroups) {
    selectedGroupsNodes.push(...group);
  }
  const touchingNodes = getTouchingNodesInDirection(nodesToMove, direction, selectedGroupsNodes);
  for (const node of touchingNodes) {
    nodesToMove.add(node);
  }

  const unselectedGroups = groups.filter(group => [...group].every(node => !node.classList.contains('selected') && document.activeElement !== node));
  for (const group of selectedGroups) {
    var newGroup = new Set();
    for (const node of group) {
      if (node.classList.contains('selected') || document.activeElement === node) {
        newGroup.add(node);
      }
    }
    unselectedGroups.push(newGroup);
  }

  const touchingGroups = getTouchingGroupsInDirection(nodesToMove, direction, unselectedGroups);
  for (const group of touchingGroups) {
    if ([...group].every(node => !nodesToMove.has(node))) {
      for (const node of group) {
        nodesToMove.add(node);
      }
    }
  }
  const moveDelta = {
    left:  {x: -64, y:   0},
    right: {x:  64, y:   0},
    up:    {x:   0, y: -32},
    down:  {x:   0, y:  32},
  }[direction];
  const willNodeBeMovedOutOfBounds = [...nodesToMove].find(node => {
    return parseInt(node.style.left) + moveDelta.x < 0 ||
           parseInt(node.style.top)  + moveDelta.y < 0;
  });
  if (willNodeBeMovedOutOfBounds) return false;

  const oldPositions = [...nodesToMove].map(node => {return {node: node, left: node.style.left, top: node.style.top}});

  for (const node of nodesToMove) {
    node.style.left = (parseInt(node.style.left) + moveDelta.x) + 'px';
    node.style.top  = (parseInt(node.style.top)  + moveDelta.y) + 'px';
    node.links.forEach(link => affectedLinks.add(link));
  }
  affectedLinks.forEach(link => layoutLink(link));

  const cursorBefore = {
    x: parseInt(cursor.style.left),
    y: parseInt(cursor.style.top),
  }
  cursor.style.left = (parseInt(cursor.style.left) + moveDelta.x) + 'px';
  cursor.style.top  = (parseInt(cursor.style.top)  + moveDelta.y) + 'px';
  const cursorAfter = {
    x: parseInt(cursor.style.left),
    y: parseInt(cursor.style.top),
  }

  const selectionBoxBefore = getSelectionBox();
  selectionBox.style.left = (parseInt(selectionBox.style.left) + moveDelta.x) + 'px';
  selectionBox.style.top  = (parseInt(selectionBox.style.top)  + moveDelta.y) + 'px';
  const selectionBoxAfter = getSelectionBox();

  const newPositions = [...nodesToMove].map(node => {return {node: node, left: node.style.left, top: node.style.top}});

  recordAction(
    new moveNodesAction({oldPositions, newPositions}),
    {
      cursor: {before: cursorBefore, after: cursorAfter},
      selectionBox: {before: selectionBoxBefore, after: selectionBoxAfter}
    }
  );
}

function createInstanceInDirection(direction) {
  const node = getNodeAtCursor();
  if (!node) {
    return;
  }

  if (getAdjacentNodesInDirection(node, direction).length !== 0) {
    return;
  }

  const instance = document.createElement('input');
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

function moveCursorInDirection(direction, options = {}) {
  const moveDelta = {
    left:  {x: -64, y:   0},
    right: {x:  64, y:   0},
    up:    {x:   0, y: -32},
    down:  {x:   0, y:  32},
  }[direction];
  const cursorX = parseInt(cursor.style.left) + moveDelta.x;
  const cursorY = parseInt(cursor.style.top)  + moveDelta.y;
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
  const nodeUnderCursor = getNodeAtCursor();
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
  const nodeAtCursor = getNodeAtCursor();
  if (nodeAtCursor) {
    deselectAll();
    for (const node of getConnectedNodes(nodeAtCursor)) {
      node.classList.add('selected');
      if (node.overflowMap) {
        for (const nodeShadow of Object.values(node.overflowMap)) {
          nodeShadow.classList.add('selected');
        }
      }
    }
  }
}

function selectInstancesOfNodeAtCursor(options = {}) {
  const nodeAtCursor = getNodeAtCursor();
  if (nodeAtCursor) {
    deselectAll();
    const nodes = options.onlyConnectedNodes ?
      getConnectedNodes(nodeAtCursor).filter(connectedNode => connectedNode.dataset.id === nodeAtCursor.dataset.id)
      :
      currentSurface.querySelectorAll(`.node[data-id='${nodeAtCursor.dataset.id}']`);
    for (const node of nodes) {
      node.classList.add('selected');
      if (node.overflowMap) {
        for (const nodeShadow of Object.values(node.overflowMap)) {
          nodeShadow.classList.add('selected');
        }
      }
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
  const points = [];
  if (link.from) {
    const nextPoint = link.via ? getNodeCenter(link.via) : lastPosition;
    const anchorPoints = getNodeAnchorPoints(link.from);
    for (let anchor of anchorPoints) {
      anchor.distance = Math.pow(nextPoint.x - anchor.point.x, 2) + Math.pow(nextPoint.y - anchor.point.y, 2);
    }
    anchorPoints.sort((a, b) => a.distance - b.distance);
    points.push(anchorPoints[0].point);
  }
  if (link.via) {
    points.push(getNodeCenter(link.via));
  }
  if (link.to) {
    const viaPoint = getNodeCenter(link.via);
    const anchorPoints = getNodeAnchorPoints(link.to);
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

function updateOverflowMaps(nodes, surface) {
  const surfaceContainer = surface.closest('.surface-container');
  if (!surfaceContainer) {
    return;
  }
  for (const overflowMap of surfaceContainer.getElementsByClassName('overflow-map')) {
    const edge = overflowMap.dataset.edge;
    // Create/update shadows for existing nodes
    for (const node of nodes) {
      node.overflowMap = node.overflowMap || {};
      let nodeShadow = node.overflowMap[edge];
      if (!nodeShadow) {
        nodeShadow = document.createElement('div');
        nodeShadow.classList.add('node-shadow');
        nodeShadow.classList.toggle('selected', node.classList.contains('selected'));
        nodeShadow.node = node;
        overflowMap.appendChild(nodeShadow);
        node.overflowMap[edge] = nodeShadow;
      }
      layoutNodeShadow(nodeShadow, node, edge);
    }
    // Remove shadows for deleted nodes
    for (const nodeShadow of [...overflowMap.getElementsByClassName('node-shadow')]) {
      if (!nodeShadow.node.parentElement) {
        nodeShadow.remove();
        delete nodeShadow.node.overflowMap[edge];
      }
    }
  }
}

function layoutNodeShadow(shadow, node, edge) {
  // Position
  shadow.style.left = node.style.left;
  shadow.style.top  = node.style.top;

  // Dimensions
  if (edge === 'top' || edge === 'bottom') {
    shadow.style.width = node.style.width;
  }
  if (edge === 'right') {
    shadow.style.width = (parseInt(node.style.width) + 5000) + 'px';
  } else if (edge === 'bottom') {
    shadow.style.height = (20 + 5000) + 'px';
  }

  // Z-index
  if (edge === 'left') {
    shadow.style.zIndex = parseInt(node.style.left);
  } else if (edge === 'top') {
    shadow.style.zIndex = parseInt(node.style.top);
  } else if (edge === 'right') {
    shadow.style.zIndex = 5000 - parseInt(node.style.left);
  } else if (edge === 'bottom') {
    shadow.style.zIndex = 5000 - parseInt(node.style.top);
  }
}

for (const surface of document.getElementsByClassName('surface')) {
  const surfaceContainer = surface.closest('.surface-container');
  if (surfaceContainer) {
    for (const overflowMap of surfaceContainer.getElementsByClassName('overflow-map')) {
      surface.addEventListener('scroll', event => {
        overflowMap.scrollTo(surface.scrollLeft, surface.scrollTop);
      });
      overflowMap.addEventListener('mousedown', event => {
        if (event.target.classList.contains('node-shadow')) {
          if (overflowMap.dataset.edge === 'left') {
            surface.scrollTo({left: parseInt(event.target.node.style.left), behavior: 'smooth'});
          } else if (overflowMap.dataset.edge === 'top') {
            surface.scrollTo({top: parseInt(event.target.node.style.top), behavior: 'smooth'});
          } else if (overflowMap.dataset.edge === 'right') {
            const nodeRight = parseInt(event.target.node.style.left) + parseInt(event.target.node.style.width) + 14;
            surface.scrollTo({left: nodeRight - (surfaceContainer.offsetWidth - 40), behavior: 'smooth'});
          } else if (overflowMap.dataset.edge === 'bottom') {
            const nodeBottom = parseInt(event.target.node.style.top) + 32;
            surface.scrollTo({top: nodeBottom - (surfaceContainer.offsetHeight - 40), behavior: 'smooth'});
          }
        }
      });
    }
  }
}

function deserialize(nodes, links) {
  for (let link of links) {
    link.from = document.getElementById(link.dataset.from);
    link.via  = document.getElementById(link.dataset.via);
    link.to   = document.getElementById(link.dataset.to);
  }
  for (let node of nodes) {
    if (node.dataset.links) {
      node.links = new Set(node.dataset.links.split(',').map(id => document.getElementById(id)));
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

function getNodesAndLinksAsHtml(nodes=[...mainSurface.getElementsByClassName('node')], links=[...mainSurface.getElementsByClassName('link')]) {
  const classes = new Map();
  for (let node of nodes) {
    classes.set(node, node.className);
    node.className = 'node';
  }
  for (let link of links) {
    classes.set(link, link.className.baseVal);
    link.className.baseVal = 'link';
  }

  // Assign IDs to nodes and links
  let id = 0;
  for (let node of nodes) {
    node.id = id++;
  }
  for (let link of links) {
    link.id = id++;
    link.dataset.from = link.from.id;
    link.dataset.via  = link.via.id;
    link.dataset.to   = link.to.id;
  }

  const linksSet = new Set(links);
  for (let node of nodes) {
    if (node.links.size > 0) {
      node.dataset.links = [...node.links].filter(link => linksSet.has(link)).map(link => link.id).join(',');
    }
  }

  const html = '<div class="nodes">' + [...nodes].map(node => node.outerHTML).join('') + '</div>' +
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

function insertNodesAndLinksFromHtml(html, position=null) {
  const fragment = document.createRange().createContextualFragment(html);
  const nodes = [...fragment.querySelectorAll('.node')];
  let   links = [...fragment.querySelectorAll('.link')];
  for (let node of nodes) currentSurface.getElementsByClassName('nodes')[0].appendChild(node);
  links = links.map(link => {
    const copiedLink = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    copiedLink.id                = link.id;
    copiedLink.className.baseVal = link.className.baseVal;
    copiedLink.dataset.from      = link.dataset.from;
    copiedLink.dataset.via       = link.dataset.via;
    copiedLink.dataset.to        = link.dataset.to;
    copiedLink.setAttribute('points', link.getAttribute('points'));
    currentSurface.getElementsByClassName('links')[0].appendChild(copiedLink)
    return copiedLink;
  });
  deserialize(nodes, links);
  clearSerialization(nodes, links);
  if (position) {
    const leftmost = Math.min(...nodes.map(node => parseInt(node.style.left)));
    const topmost  = Math.min(...nodes.map(node => parseInt(node.style.top)));
    const deltaX = position.x - leftmost;
    const deltaY = position.y - topmost;
    for (let node of nodes) {
      node.style.left = (parseInt(node.style.left) + deltaX) + 'px';
      node.style.top  = (parseInt(node.style.top)  + deltaY) + 'px';
      node.classList.add('selected');
    }
    links.forEach(layoutLink);
  }
  updateOverflowMaps(nodes, currentSurface);
  evaluateCursorPosition();
  return {nodes, links};
}

async function save() {
  const html = getNodesAndLinksAsHtml();
  if (path) {
    const response = await fetch(location.origin + '/save?path=' + path, {method: 'PUT', body: html});
    if (!response.ok) {
      const responseText = await response.text();
      alert(response.statusText + ' - ' + responseText);
      return;
    }
  } else {
    localStorage.saved_state = html;
  }
  if (actions.length > 0) {
    savedAction = actions[actions.length-1];
  } else {
    savedAction = null;
  }
}

function download() {
  const element = document.createElement('a');
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
    x: pxToGridX(mainSurface.scrollLeft + event.offsetX),
    y: pxToGridY(mainSurface.scrollTop  + event.offsetY),
  });
  return false;
});
mainSurface.addEventListener('drop', event => {
  event.preventDefault();
  const html = event.dataTransfer.getData('text/html');
  const cursorPosition = {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
  if (html) {
    const inserted = insertNodesAndLinksFromHtml(html, cursorPosition);
    recordAction(new pasteElementsAction(inserted.nodes, inserted.links));
  } else if (event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
      const inserted = insertNodesAndLinksFromHtml(event.target.result, cursorPosition);
      recordAction(new pasteElementsAction(inserted.nodes, inserted.links));
    };
    reader.readAsText(file);
  }
  return false;
});
