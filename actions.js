var actions = [];
var actionsUndone = [];
var isActionInProgress = false;

function recordAction(action, options) {
  if (currentSurface === mainSurface) {
    action.options = options || {};
    actions.push(action);
    actionsUndone = [];
  } else if (currentSurface === findPanel) {
    highlightQueriedNodes();
  }
}

function undo() {
  var action = actions.pop();
  if (action) {
    setCurrentSurface(mainSurface);
    closeNameMatchPanel();
    action.undo();
    actionsUndone.push(action);
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
  var action = actionsUndone.pop();
  if (action) {
    setCurrentSurface(mainSurface);
    closeNameMatchPanel();
    action.redo();
    actions.push(action);
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


function deleteElementsAction(elements) {
  this.elements = elements;
  this.undo = () => {
    for (element of this.elements) {
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
    deleteElements(this.elements);
  };
}

function createElementsAction(elements) {
  this.elements = elements;
  this.undo = () => {
    deleteElements(this.elements);
  };
  this.redo = () => {
    for (element of this.elements) {
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

function createLinkAction(link) {
  this.link = link;
  this.undo = () => this.link.remove();
  this.redo = () => mainSurface.getElementsByClassName('links')[0].appendChild(this.link);
}

function pasteElementsAction(nodes, links) {
  this.nodes = nodes;
  this.links = links;
  this.undo = () => {
    for (node of this.nodes) node.remove();
    for (link of this.links) link.remove();
  };
  this.redo = () => {
    for (node of this.nodes) mainSurface.getElementsByClassName('nodes')[0].appendChild(node);
    for (link of this.links) mainSurface.getElementsByClassName('links')[0].appendChild(link);
  };
}

function moveNodesAction(positions) {
  this.oldPositions = positions.oldPositions;
  this.newPositions = positions.newPositions;
  this.undo = () => {
    var affectedLinks = new Set();
    for (i of this.oldPositions) {
      i.node.style.left = i.left;
      i.node.style.top  = i.top;
      for (link of i.node.links) affectedLinks.add(link);
    }
    for (link of affectedLinks) layoutLink(link);
  };
  this.redo = () => {
    var affectedLinks = new Set();
    for (i of this.newPositions) {
      i.node.style.left = i.left;
      i.node.style.top  = i.top;
      for (link of i.node.links) affectedLinks.add(link);
    }
    for (link of affectedLinks) layoutLink(link);
  };
}

function renameNodeAction(node, oldName) {
  this.node = node;
  this.oldName = oldName;
  this.newName = node.value;
  this.undo = () => {
    var instances = [...document.querySelectorAll(`[data-id="${this.node.getAttribute('data-id')}"]`)];
    for (instance of instances) {
      instance.value = this.oldName;
      instance.setAttribute('value', this.oldName);
    }
    if (document.activeElement === this.node) {
      lastFocusedNodeOriginalName = this.node.value;
    }
  }
  this.redo = () => {
    var instances = [...document.querySelectorAll(`[data-id="${this.node.getAttribute('data-id')}"]`)];
    for (instance of instances) {
      instance.value = this.newName;
      instance.setAttribute('value', this.newName);
    }
    if (document.activeElement === this.node) {
      lastFocusedNodeOriginalName = this.node.value;
    }
  }
}

function changeIdAction(node, old, new_) {
  this.undo = () => {
    node.setAttribute('data-id', old.id);
    node.value = old.name;
    node.setAttribute('value', old.name);
    if (document.activeElement === node) {
      lastFocusedNodeOriginalName = node.value;
    }
    evaluateCursorPosition();
  }
  this.redo = () => {
    node.setAttribute('data-id', new_.id);
    node.value = new_.name;
    node.setAttribute('value', new_.name);
    if (document.activeElement === node) {
      lastFocusedNodeOriginalName = node.value;
    }
    evaluateCursorPosition();
  }
}
