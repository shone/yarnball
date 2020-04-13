import {
  mainSurface,
  currentSurface,
  updateOverflowMaps,
  setCurrentSurface,
  closeNameMatchPanel,
  layoutLink,
  setNodeName,
  evaluateCursorPosition,
  deleteElements
} from './main.mjs';

const actions = [];
var actionsUndone = [];
var savedAction = null;

export function undo() {
  const action = actions.pop();
  if (action) {
    setCurrentSurface(mainSurface);
    closeNameMatchPanel();
    action.undo();
    actionsUndone.push(action);
    updateOverflowMaps(mainSurface.getElementsByClassName('node'), mainSurface);
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

export function redo() {
  const action = actionsUndone.pop();
  if (action) {
    setCurrentSurface(mainSurface);
    closeNameMatchPanel();
    action.redo();
    actions.push(action);
    updateOverflowMaps(mainSurface.getElementsByClassName('node'), mainSurface);
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

export let isActionInProgress = false;
export function setActionInProgress(inProgress) {
  isActionInProgress = inProgress;
}

function recordAction(action, options) {
  if (currentSurface === mainSurface) {
    action.options = options || {};
    actions.push(action);
    actionsUndone = [];
    updateOverflowMaps(mainSurface.getElementsByClassName('node'), mainSurface);
  } else if (currentSurface === findPanel) {
    highlightQueriedNodes();
  }
}

window.addEventListener('beforeunload', event => {
  if (actions.length > 0 && actions[actions.length-1] !== savedAction) {
    event.preventDefault();
    event.returnValue = '';
  }
});

export const markElementsDeleted = elements => recordAction({
  undo() {
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
  },
  redo() {
    deleteElements(elements);
  }
});

export const markElementsCreated = elements => recordAction({
  undo() {
    deleteElements(elements);
  },
  redo() {
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
  }
});

export const markElementsPasted = (nodes, links) => recordAction({
  undo() {
    for (const node of nodes) node.remove();
    for (const link of links) link.remove();
    evaluateCursorPosition();
  },
  redo() {
    for (const node of nodes) mainSurface.getElementsByClassName('nodes')[0].appendChild(node);
    for (const link of links) mainSurface.getElementsByClassName('links')[0].appendChild(link);
    evaluateCursorPosition();
  }
});

export const markNodesMoved = positions => recordAction({
  undo() {
    const affectedLinks = new Set();
    for (const i of positions.oldPositions) {
      i.node.style.left = i.left;
      i.node.style.top  = i.top;
      for (const link of i.node.links) affectedLinks.add(link);
    }
    for (const link of affectedLinks) layoutLink(link);
  },
  redo() {
    const affectedLinks = new Set();
    for (const i of positions.newPositions) {
      i.node.style.left = i.left;
      i.node.style.top  = i.top;
      for (const link of i.node.links) affectedLinks.add(link);
    }
    for (const link of affectedLinks) layoutLink(link);
  }
});

export const markNodeRenamed = (node, oldName) => {
  const newName = node.value;
  recordAction({
    undo() {
      setNodeName(node, oldName);
      if (document.activeElement === node) {
        lastFocusedNodeOriginalName = node.value;
      }
    },
    redo() {
      setNodeName(node, newName);
      if (document.activeElement === node) {
        lastFocusedNodeOriginalName = node.value;
      }
    }
  });
};

export const markIdChanged = (node, old, new_) => recordAction({
  undo() {
    node.dataset.id = old.id;
    if ('name' in old) {
      node.value = old.name;
      node.setAttribute('value', old.name);
      if (document.activeElement === node) {
        lastFocusedNodeOriginalName = node.value;
      }
    }
    evaluateCursorPosition();
  },
  redo() {
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
});
