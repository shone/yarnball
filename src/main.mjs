import {initSurface} from './surface.mjs';

import './commands.mjs';
import './mouse_handler.mjs';

import * as undo_redo from './undo_redo.mjs';
import * as name_matching from './name_matching.mjs';

import {
  nameMatchPanel,
  builtinNameMatches,
  closeNameMatchPanel
} from './name_matching.mjs';

import {makeUuid, getBoundingBoxForPoints} from './utils.mjs';

export let mainSurface = document.getElementById('main-surface');
initSurface(mainSurface);

export let currentSurface = mainSurface;
export function setCurrentSurface(surface) {
  if (currentSurface !== surface) {
    closeNameMatchPanel();
    currentSurface.classList.remove('current');
    surface.classList.add('current');
    currentSurface = surface;
  }
}

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

document.querySelector('.panel[data-panel="examples"]').onclick = async ({target}) => {
  if (target.tagName === 'BUTTON') {
    const response = await fetch(`../examples/${target.dataset.example}`);
    const text = await response.text();
    mainSurface.clear();
    mainSurface.insertNodesAndLinksFromHtml(text);
  }
}

const bottomPanelContainer = document.querySelectorAll('.panels-container.bottom')[0];

export const pxToGridX = px => Math.round(px / 64) * 64;
export const pxToGridY = px => Math.round(px / 32) * 32;

export function cancelCurrentModeOrOperation() {

  currentSurface.deselectAll();

  if (nameMatchPanel.parentElement) {
    closeNameMatchPanel();
    return;
  }

  if (currentSurface.isLinkModeActive()) {
    currentSurface.cancelLinkMode();
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

document.addEventListener('input', event => {
  if (event.target.classList.contains('node')) {
    const node = event.target;
    node.setName(node.value);
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


document.addEventListener('paste', event => {
  if (event.clipboardData.items.length !== 1) return;
  const item = event.clipboardData.items[0];
  if (item.kind !== 'string') return;
  item.getAsString(string => {
    const inserted = currentSurface.insertNodesAndLinksFromHtml(string, currentSurface.getCursorPosition());
    currentSurface.evaluateCursorPosition();
//     const selectionBox = getSelectionBox();
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

for (let panelContainer of document.getElementsByClassName('panels-container')) {
  for (let panelHeader of panelContainer.querySelectorAll('.headers button')) {
    panelHeader.addEventListener('click', event => {
      if (!panelContainer.dataset.panel || panelContainer.dataset.panel !== panelHeader.dataset.panel) {
        panelContainer.dataset.panel = panelHeader.dataset.panel;
        panelContainer.classList.add('expanded');
//         evaluateCursorPosition();
      } else {
        panelContainer.dataset.panel = '';
        panelContainer.classList.remove('expanded');
      }
    });
  }
}


// Find panel

export const findPanel = document.querySelectorAll('.panel[data-panel="find"]')[0];
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
  findPanel.resetCursorBlink();
  const nodeUnderCursor = findPanel.getNodeAtCursor();
  if (nodeUnderCursor) {
    nodeUnderCursor.focus();
  }
}
export function highlightQueriedNodes() {
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
    mainSurface.setCursorPosition([...queriedNodes][0].getPos());
  }
}

export function selectNameMatchOrInsertNodeDown() {
  if (nameMatchPanel.parentElement) {
    name_matching.applyCurrentNameMatchSelection();
  } else {
    currentSurface.insertNodeAtCursor({moveAdjacent: 'down' });
  }
}

export async function save() {
  const html = mainSurface.getNodesAndLinksAsHtml();
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
  undo_redo.markSaved();
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
