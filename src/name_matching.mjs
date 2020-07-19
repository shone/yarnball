import {currentSurface} from './main.mjs';
import * as undo_redo from './undo_redo.mjs';

export const builtinNameMatches = [];

export const nameMatchPanel = document.getElementById('name-match-panel');

export function closeNameMatchPanel() {
  nameMatchPanel.remove();
  for (let node of [...document.getElementsByClassName('name-match-selected')]) {
    node.classList.remove('name-match-selected');
  }
}

nameMatchPanel.addEventListener('click', event => {
  if (event.target.classList.contains('name-match')) {
    applyCurrentNameMatchSelection(event.target);
  }
});

export function moveNameMatchSelection(direction) {
  var selectedMatch = nameMatchPanel.querySelector('.name-match.selected');
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
    const firstMatch = nameMatchPanel.querySelector('.name-match');
    if (firstMatch) {
      firstMatch.classList.add('selected');
      for (let node of document.querySelectorAll(`.node[data-id='${firstMatch.dataset.id}']`)) {
        node.classList.add('name-match-selected');
      }
    }
  }
}

export function applyCurrentNameMatchSelection(nameMatch = nameMatchPanel.querySelector('.selected')) {
  if (!nameMatch) {
    return;
  }
  const node = currentSurface.getNodeAtCursor();
  if (node.dataset.id !== nameMatch.dataset.id) {
    const oldId = node.dataset.id;
    const oldName = node.value;
    node.setAttribute('data-id', nameMatch.dataset.id);
    node.setName(nameMatch.textContent);
    currentSurface.lastFocusedNodeOriginalName = nameMatch.textContent;
    undo_redo.markIdChanged(node, {id: oldId, name: oldName}, {id: nameMatch.dataset.id, name: nameMatch.textContent});
  }
  nameMatchPanel.remove();
  currentSurface.resetCursorBlink();
  for (let otherNode of document.getElementsByClassName('node')) {
    otherNode.classList.remove('name-match-selected');
    otherNode.classList.toggle('cursor-at-instance', otherNode.dataset.id === nameMatch.dataset.id);
  }
}
