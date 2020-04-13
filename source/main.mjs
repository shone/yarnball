import * as undo_redo from './undo_redo.mjs';
import {builtinNameMatches} from './name_matching.mjs';
import {makeUuid, getBoundingBoxForPoints} from './utils.mjs';

import {initSurface} from './surface.mjs';
import './commands.mjs';
import './mouse_handler.mjs';

const queryParams = new URLSearchParams(location.search.substring(1));
const path = queryParams.get('path');

(async function load() {
  if (path) {
    const filename = path.split('/').slice(-1)[0];
    document.title = `${filename} — Yarnball`;
    tinyWindowWorkaround();
    const response = await fetch(location.origin + '/load?path=' + path);
    const text = await response.text();
    if (response.ok) {
      mainSurface.insertNodesAndLinksFromHtml(text);
    } else {
      alert(response.statusText + ' - ' + text);
    }
  } else if (localStorage.saved_state) {
    mainSurface.insertNodesAndLinksFromHtml(localStorage.saved_state);
  }
  function tinyWindowWorkaround() {
    if (window.outerWidth < 100 || window.outerHeight < 100) {
      // When chromium is opened in app mode on my machine, the initial window size is tiny
      // This resizes it to sensible initial dimensions
      window.resizeTo(
        Math.max(window.outerWidth, 640),
        Math.max(window.outerHeight, 480)
      );
    }
  }
})();

export let mainSurface = document.getElementById('main-surface');
initSurface(mainSurface);
export let currentSurface = mainSurface;

export function setCurrentSurface(surface) {
  if (currentSurface !== surface) {
    closeNameMatchPanel();
    currentSurface.classList.remove('current');
    surface.classList.add('current');
    currentSurface = surface;
    cursor       = currentSurface.getElementsByClassName('cursor')[0];
    selectionBox = currentSurface.getElementsByClassName('selection-box')[0];
  }
}

const bottomPanelContainer = document.querySelectorAll('.panels-container.bottom')[0];

// Cursor

export var cursor = currentSurface.getElementsByClassName('cursor')[0];
function getCursorPosition() {
  return {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
}
export function moveCursorToNode(node) {
  setCursorPosition({x: parseInt(node.style.left), y: parseInt(node.style.top)});
}
export function getNodeAtCursor(surface = currentSurface) {
  const cursor_ = surface.getElementsByClassName('cursor')[0];
  return surface.getNodeAtPosition({x: parseInt(cursor_.style.left), y: parseInt(cursor_.style.top)});
}
export function moveCursorToBlockEdge(direction, options) {
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
    currentSurface.deselectAll();
  }
}

export const pxToGridX = px => Math.round(px / 64) * 64;
export const pxToGridY = px => Math.round(px / 32) * 32;


export var linkBeingCreated = null;
export function useNodeForLinkCreationMode(node) {
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
        undo_redo.markElementsDeleted([existingLink]);
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
export function executeLinkMode() {
  if (!linkBeingCreated) {
    linkBeingCreated = currentSurface.createLink();
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
        undo_redo.markElementsCreated([createdLink]);
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

export function deleteElements(elements) {
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

export function deleteSelection() {
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
//   recordAction(
    undo_redo.markElementsDeleted(new Set([...elementsToDelete, ...affectedLinks]));
//     {
//       selectionBox: {before: getSelectionBox(), after: null},
//     }
//   );
  selectionBox.classList.add('hidden');
}

export function backspace() {
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
//       recordAction(
        undo_redo.markElementsDeleted([node, ...affectedLinks]);
//         {cursor: {before: oldCursorPosition, after: newCursorPosition}}
//       );
    }
  } else {
    setCursorPosition({x: Math.max(0, parseInt(cursor.style.left) - 64), y: parseInt(cursor.style.top)});
  }
}

export function cancelCurrentModeOrOperation() {

  currentSurface.deselectAll();

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

// Selection box
export var selectionBox = currentSurface.getElementsByClassName('selection-box')[0];


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
      undo_redo.markNodeRenamed(event.target, lastFocusedNodeOriginalName);
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


// Name match panel

const nameMatchPanel = document.getElementById('name-match-panel');

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
    undo_redo.markIdChanged(node, {id: oldId, name: oldName}, {id: nameMatch.dataset.id, name: nameMatch.textContent});
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

export function closeNameMatchPanel() {
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
//     recordAction(
      undo_redo.markElementsPasted(inserted.nodes, inserted.links);
//       {
//         selectionBox: {before: selectionBox, after: null},
//       }
//     );
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
initSurface(findPanel);

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
export function openFindPanel() {
  bottomPanelContainer.dataset.panel = 'find';
  bottomPanelContainer.classList.add('expanded');
  const findPanelNodes = findPanel.getElementsByClassName('nodes')[0];
  if (findPanelNodes.getElementsByClassName('node').length === 0) {
    findPanel.createNode({position: {x: 0, y: 0}, parent: findPanelNodes});
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
export function moveSelectionToQueriedNodes() {
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

function selectNameMatchOrInsertNodeDown() {
  if (nameMatchPanel.parentElement) {
    applyCurrentNameMatchSelection();
  } else {
    insertNodeAtCursor({moveAdjacent: 'down' });
  }
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

export async function save() {
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

function getAsYarnballFile() {
  let file = '';

  const nodeNames = new Map();
  for (const node of [...mainSurface.getElementsByClassName('node')]) {
    nodeNames.set(node.dataset.id, node.value);
  }

  file += '[node_names]\n';
  for (const [id, name] of nodeNames) {
    file += `${id} ${name}\n`;
  }

  file += '[node_layout]\n';
  let index = 0;
  let instanceIndex = 0;
  const instanceIndexes = new Map();
  for (const id of nodeNames.keys()) {
    const instances = [...mainSurface.querySelectorAll(`.node[data-id="${id}"]`)];
    for (const instance of instances) {
      file += `${index} ${parseInt(instance.style.left)},${parseInt(instance.style.top)}\n`;
      instanceIndexes.set(instance, instanceIndex);
      instanceIndex++;
    }
    index++;
  }

  file += '[link_layout]\n';
  for (const link of [...mainSurface.getElementsByClassName('link')]) {
    file += `${instanceIndexes.get(link.from)} ${instanceIndexes.get(link.via)} ${instanceIndexes.get(link.to)}\n`;
  }

  file += '[graph]\n';
  const uniqueLinks = new Set([...mainSurface.getElementsByClassName('link')].map(link => `${link.from.dataset.id} ${link.via.dataset.id} ${link.to.dataset.id}`));
  file += [...uniqueLinks].map(link => link + '\n');

  return file;
}

export function download() {
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
    undo_redo.markElementsPasted(inserted.nodes, inserted.links);
  } else if (event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
      const inserted = insertNodesAndLinksFromHtml(event.target.result, cursorPosition);
      undo_redo.markElementsPasted(inserted.nodes, inserted.links);
    };
    reader.readAsText(file);
  }
  return false;
});
