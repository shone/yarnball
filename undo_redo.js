'use strict';

const actions = [];
var actionsUndone = [];
var isActionInProgress = false;
var savedAction = null;

function recordAction(action, options) {
  if (currentSurface === mainSurface) {
    action.options = options || {};
    actions.push(action);
    actionsUndone = [];
    updateOverflowMap(mainSurface.getElementsByClassName('node'), mainSurface);
  } else if (currentSurface === findPanel) {
    highlightQueriedNodes();
  }
}

function undo() {
  const action = actions.pop();
  if (action) {
    setCurrentSurface(mainSurface);
    closeNameMatchPanel();
    action.undo();
    actionsUndone.push(action);
    updateOverflowMap(mainSurface.getElementsByClassName('node'), mainSurface);
    if (action.options.cursor) {
      setCursorPosition(action.options.cursor.before);
    }
    if (action.options.selectionBox) {
      if (action.options.selectionBox.before) {
        setSelectionBox(action.options.selectionBox.before);
        selectionBox.classList.remove('hidden');
      } else {
        selectionBox.classList.add('hidden');
      }
    }
  }
}

function redo() {
  const action = actionsUndone.pop();
  if (action) {
    setCurrentSurface(mainSurface);
    closeNameMatchPanel();
    action.redo();
    actions.push(action);
    updateOverflowMap(mainSurface.getElementsByClassName('node'), mainSurface);
    if (action.options.cursor) {
      setCursorPosition(action.options.cursor.after);
    }
    if (action.options.selectionBox) {
      if (action.options.selectionBox.after) {
        setSelectionBox(action.options.selectionBox.after);
        selectionBox.classList.remove('hidden');
      } else {
        selectionBox.classList.add('hidden');
      }
    }
  }
}

window.addEventListener('beforeunload', event => {
  if (actions.length > 0 && actions[actions.length-1] !== savedAction) {
    event.preventDefault();
    event.returnValue = '';
  }
});

function deleteElementsAction(elements) {
  this.undo = () => {
    for (const element of elements) {
      if (element.classList.contains('node')) {
        mainSurface.getElementsByClassName('nodes')[0].appendChild(element);
      } else if (element.classList.contains('link')) {
        mainSurface.getElementsByClassName('links')[0].appendChild(element);
        element.from.links.add(element);
        element.via.links.add(element);
        element.to.links.add(element);
      }
    }
    evaluateCursorPosition();
  };
  this.redo = () => {
    deleteElements(elements);
  };
}

function createElementsAction(elements) {
  this.undo = () => {
    deleteElements(elements);
  };
  this.redo = () => {
    for (let element of elements) {
      if (element.classList.contains('node')) {
        mainSurface.getElementsByClassName('nodes')[0].appendChild(element);
      } else if (element.classList.contains('link')) {
        mainSurface.getElementsByClassName('links')[0].appendChild(element);
        element.from.links.add(element);
        element.via.links.add(element);
        element.to.links.add(element);
      }
    }
    evaluateCursorPosition();
  };
}

function pasteElementsAction(nodes, links) {
  this.undo = () => {
    for (const node of nodes) node.remove();
    for (const link of links) link.remove();
    evaluateCursorPosition();
  };
  this.redo = () => {
    for (const node of nodes) mainSurface.getElementsByClassName('nodes')[0].appendChild(node);
    for (const link of links) mainSurface.getElementsByClassName('links')[0].appendChild(link);
    evaluateCursorPosition();
  };
}

function moveNodesAction(positions) {
  this.undo = () => {
    const affectedLinks = new Set();
    for (const i of positions.oldPositions) {
      i.node.style.left = i.left;
      i.node.style.top  = i.top;
      for (const link of i.node.links) affectedLinks.add(link);
    }
    for (const link of affectedLinks) layoutLink(link);
  };
  this.redo = () => {
    const affectedLinks = new Set();
    for (const i of positions.newPositions) {
      i.node.style.left = i.left;
      i.node.style.top  = i.top;
      for (const link of i.node.links) affectedLinks.add(link);
    }
    for (const link of affectedLinks) layoutLink(link);
  };
}

function renameNodeAction(node, oldName) {
  const newName = node.value;
  this.undo = () => {
    setNodeName(node, oldName);
    if (document.activeElement === node) {
      lastFocusedNodeOriginalName = node.value;
    }
  }
  this.redo = () => {
    setNodeName(node, newName);
    if (document.activeElement === node) {
      lastFocusedNodeOriginalName = node.value;
    }
  }
}

function changeIdAction(node, old, new_) {
  this.undo = () => {
    node.dataset.id = old.id;
    if ('name' in old) {
      node.value = old.name;
      node.setAttribute('value', old.name);
      if (document.activeElement === node) {
        lastFocusedNodeOriginalName = node.value;
      }
    }
    evaluateCursorPosition();
  }
  this.redo = () => {
    node.dataset.id = new_.id;
    if ('name' in new_) {
      node.value = new_.name;
      node.setAttribute('value', new_.name);
      if (document.activeElement === node) {
        lastFocusedNodeOriginalName = node.value;
      }
    }
    evaluateCursorPosition();
  }
}
