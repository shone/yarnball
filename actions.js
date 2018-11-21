var actions = [];
var actionsUndone = [];

function recordAction(action) {
  actions.push(action);
  actionsUndone = [];
}

function undo() {
  var action = actions.pop();
  if (action) {
    action.undo();
    actionsUndone.push(action);
  }
}

function redo() {
  var action = actionsUndone.pop();
  if (action) {
    action.redo();
    actions.push(action);
  }
}


function deleteElements_(elements) {
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
  return this;
}

function createNode_(node) {
  this.node = node;
  this.undo = () => this.node.remove();
  this.redo = () => mainSurface.appendChild(this.node);
}

function moveNodes(positions) {
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
