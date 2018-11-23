var actions = [];
var actionsUndone = [];

function recordAction(action, options) {
  if (currentSurface === mainSurface) {
    action.options = options || {};
    actions.push(action);
    actionsUndone = [];
  }
}

function undo() {
  var action = actions.pop();
  if (action) {
    setCurrentSurface(mainSurface);
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
      }
    }
  };
  this.redo = () => {
    for (element of this.elements) element.remove();
  };
}

function createNodeAction(node) {
  this.node = node;
  this.undo = () => this.node.remove();
  this.redo = () => mainSurface.getElementsByClassName('nodes')[0].appendChild(this.node);
}

function createLinkAction(link) {
  this.link = link;
  this.undo = () => this.link.remove();
  this.redo = () => mainSurface.getElementsByClassName('links')[0].appendChild(this.link);
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
  this.undo = () => this.node.value = this.oldName;
  this.redo = () => this.node.value = this.newName;
}
