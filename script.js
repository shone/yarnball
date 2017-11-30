if (localStorage.saved_state) {
  restoreState();
}

var body = document.getElementsByTagName('body')[0];
var linksSvg = document.getElementById('links-svg');

var cursorOnMousedownPosition = {x: 0, y: 0};
var lastCursorPosition = {x: 0, y: 0};

function* followListLinks(node, forward) {
  do {
    var forwardLink = Array.from(node.links).find(link => link.from === node && (link.via.textContent === forward || link.via.instances.has(forward)));
    if (forwardLink) {
      yield forwardLink;
    }
    node = forwardLink ? forwardLink.to : null;
  } while(node)
}

function* followListNodes(node, forward) {
  do {
    yield node;
    var forwardLink = Array.from(node.links).find(link => link.from === node && (link.via.textContent === forward || link.via.instances.has(forward)));
    node = forwardLink ? forwardLink.to : null;
  } while(node)
}

function doArrayLayout(startNode, forwardNode) {
  var previousNode = startNode;
  var affectedLinks = new Set();
  for (let currentLink of followListLinks(startNode, forwardNode)) {
    currentLink.from.classList.add('selected');
    currentLink.via.classList.add('selected');
    currentLink.to.classList.add('selected');

    currentLink.to.style.left = previousNode.style.left;
    currentLink.to.style.top = (parseFloat(previousNode.style.top) + 200) + 'px';
    currentLink.to.links.forEach(link => affectedLinks.add(link));

    currentLink.via.style.left = (parseFloat(previousNode.style.left) - 200) + 'px';
    currentLink.via.style.top  = (parseFloat(previousNode.style.top) + 100) + 'px';
    currentLink.via.links.forEach(link => affectedLinks.add(link));

    previousNode = currentLink.to;
  }
  affectedLinks.forEach(layoutLink);
}

function getSingleSelectedNode() {
  var selectedNodes = document.querySelectorAll('.node.selected');
  return selectedNodes.length === 1 ? selectedNodes[0] : null;
}

function createNode(position, text) {
  var node = document.createElement('div');
  node.classList.add('node');
  node.textContent = text;
  node.style.left = String(position.x) + 'px';
  node.style.top  = String(position.y) + 'px';
  node.instances = new Set();
  node.instances.add(node);
  node.links = new Set();
  body.appendChild(node);
  return node;
}

function createLink(options) {
  var link = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  link.classList.add('link');
  link.setAttribute('marker-end', 'url(#Triangle)');
  linksSvg.appendChild(link);
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

// Node dragging
var nodePositionOnMousedown = null;
function handleNodeMousedown(event) {
  if (event.button === 0 && event.ctrlKey && event.altKey) {
    var selectedNode = getSingleSelectedNode();
    if (selectedNode) {
      doArrayLayout(selectedNode, event.target);
    }
  } else if (event.button === 0) {
    event.preventDefault();
    event.stopPropagation();
    if (!event.target.classList.contains('selected') && !event.shiftKey) {
      Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
    }
    event.target.classList.add('selected');
    cursorOnMousedownPosition = {x: event.pageX, y: event.pageY};
    lastCursorPosition = cursorOnMousedownPosition;
    nodePositionOnMousedown = {x: parseFloat(event.target.style.left), y: parseFloat(event.target.style.top)};
    window.addEventListener('mousemove', handleNodeMousemove);
    window.addEventListener('mouseup',   handleNodeMouseup);
    return false;
  }
}
function handleNodeMouseup() {
  window.removeEventListener('mousemove', handleNodeMousemove);
  window.removeEventListener('mouseup',   handleNodeMouseup);
}
function handleNodeMousemove(event) {
  var deltaX = event.pageX - lastCursorPosition.x;
  var deltaY = event.pageY - lastCursorPosition.y;
  lastCursorPosition = {x: event.pageX, y: event.pageY};
  var affectedLinks = new Set();
  document.querySelectorAll('.node.selected').forEach(node => {
    node.style.left = (parseFloat(node.style.left) + deltaX) + 'px';
    node.style.top  = (parseFloat(node.style.top)  + deltaY) + 'px';
    node.links.forEach(link => affectedLinks.add(link));
  });
  affectedLinks.forEach(link => {
    link.setAttribute('points', parseFloat(link.from.style.left) + ',' + parseFloat(link.from.style.top) + ' ' + parseFloat(link.via.style.left) + ',' + parseFloat(link.via.style.top) + ' ' + parseFloat(link.to.style.left) + ',' + parseFloat(link.to.style.top));
  });
}

// Node creation
body.addEventListener('dblclick', (event) => {
  var node = createNode({x: event.pageX, y: event.pageY});
});

// Selection box
var selectionBox = document.getElementById("selection-box");
var selectionBoxPosition = {left: 0, top: 0, right: 0, bottom: 0};
function updateSelectionBox() {
  selectionBox.style.left   = selectionBoxPosition.left   + 'px';
  selectionBox.style.top    = selectionBoxPosition.top    + 'px';
  selectionBox.style.width  = (selectionBoxPosition.right  - selectionBoxPosition.left) + 'px';
  selectionBox.style.height = (selectionBoxPosition.bottom - selectionBoxPosition.top)  + 'px';
}
function handleBackgroundMousedownForSelectionBox(event) {
  if (event.target.tagName !== 'BODY') return;
  event.preventDefault();
  Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
  window.addEventListener('mousemove', handleBackgroundMousemove);
  window.addEventListener('mouseup',   handleBackgroundMouseup);
  cursorOnMousedownPosition = {x: event.pageX, y: event.pageY};
  selectionBoxPosition = {left: 0, top: 0, right: 0, bottom: 0};
  updateSelectionBox();
  return false;
}
function handleBackgroundMouseup(event) {
  window.removeEventListener('mousemove', handleBackgroundMousemove);
  window.removeEventListener('mouseup',   handleBackgroundMouseup);
  selectionBoxPosition = {left: 0, top: 0, right: 0, bottom: 0};
  updateSelectionBox();
}
function handleBackgroundMousemove(event) {
  selectionBoxPosition.left   = Math.min(cursorOnMousedownPosition.x, event.pageX);
  selectionBoxPosition.top    = Math.min(cursorOnMousedownPosition.y, event.pageY);
  selectionBoxPosition.right  = Math.max(cursorOnMousedownPosition.x, event.pageX);
  selectionBoxPosition.bottom = Math.max(cursorOnMousedownPosition.y, event.pageY);
  updateSelectionBox();
  Array.from(document.getElementsByClassName('node')).forEach((node) => {
    var inSelectionBox = !(
      ((parseFloat(node.style.left) + (node.offsetWidth  - 41)) < selectionBoxPosition.left)  ||
      ((parseFloat(node.style.left) - 41)                       > selectionBoxPosition.right) ||
      ((parseFloat(node.style.top)  + (node.offsetHeight - 41)) < selectionBoxPosition.top)   ||
      ((parseFloat(node.style.top)  - 41)                       > selectionBoxPosition.bottom)
    );
    node.classList.toggle('selected', inSelectionBox);
  });
}

// Node renaming
var renameInput = null;
body.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    var selectedNode = getSingleSelectedNode();
    if (selectedNode) {
      if (!renameInput) {
        renameInput = document.createElement('input');
        renameInput.value = selectedNode.textContent;
        selectedNode.textContent = '';
        renameInput.select();
        selectedNode.appendChild(renameInput);
        renameInput.focus();
      } else {
        renameInput.parentElement.instances.forEach(node => {node.textContent = renameInput.value});
        renameInput.remove();
        renameInput = null;
      }
    }
  }
});

function duplicateNodes(nodes) {
  var affectedLinks = new Set();
  var duplicatedNodesMap = new Map();
  nodes = new Set(nodes);
  nodes.forEach(node => {
    node.links.forEach(link => affectedLinks.add(link));
    var nodeInstance = createNode({x: parseFloat(node.style.left) + 10, y: parseFloat(node.style.top) + 10});
    nodeInstance.textContent = node.textContent;
    node.instances.add(nodeInstance);
    nodeInstance.instances = node.instances;
    node.classList.remove('selected');
    nodeInstance.classList.add('selected');
    duplicatedNodesMap.set(node, nodeInstance);
  });
  affectedLinks = new Set(Array.from(affectedLinks).filter(link => {
    return nodes.has(link.from) && nodes.has(link.via) && nodes.has(link.to);
  }));
  affectedLinks.forEach(link => {
    var duplicatedLink = createLink({
      from: duplicatedNodesMap.get(link.from),
      via:  duplicatedNodesMap.get(link.via),
      to:   duplicatedNodesMap.get(link.to),
    });
    layoutLink(duplicatedLink);
  });
}

document.addEventListener('keypress', event => {
  if (renameInput) return;
  if (event.key === 'd') {
    event.preventDefault();
    duplicateNodes(Array.from(document.getElementsByClassName('selected')));
    return false;
  } else if (event.key === 'Delete') {
    var affectedLinks = new Set();
    Array.from(document.getElementsByClassName('selected')).forEach(element => {
      if (element.classList.contains('node')) {
        element.links.forEach(link => affectedLinks.add(link));
        element.remove();
      } else if (element.classList.contains('link')) {
        affectedLinks.add(element);
      }
    });
    affectedLinks.forEach(link => {
      link.from.links.delete(link);
      link.via.links.delete(link);
      link.to.links.delete(link);
      link.remove()
    });
  } else if (event.key === 'f') {
    var selectedNode = getSingleSelectedNode();
    if (selectedNode) {
      var f = compileStatements(selectedNode);
      var returnValue = f();
      if (typeof returnValue.then === 'function') {
        returnValue.then(promisedValue => {
          if (typeof promisedValue === 'object') {
            selectedNode.classList.remove('selected');
            makeJsonGraph(promisedValue, {x: parseFloat(selectedNode.style.left), y: parseFloat(selectedNode.style.top)});
          }
        });
      } else if (typeof returnValue === 'object') {
        selectedNode.classList.remove('selected');
        makeJsonGraph(returnValue, {x: parseFloat(selectedNode.style.left), y: parseFloat(selectedNode.style.top)});
      }
    }
  } else if (event.key === 'S' && event.shiftKey && event.ctrlKey) {
    saveState();
  } else if (event.key === 'F' && event.shiftKey && event.ctrlKey) {
    restoreState();
  }
});

function compileStatements(node) {
  var statements = Array.from(followListNodes(node, ';')).map(compileStatement);
  statements[statements.length-1] = 'return ' + statements[statements.length-1];
  return new Function([], statements.join(';'));
}

function compileStatement(node) {
  var callsLink = Array.from(node.links).find(link => link.from === node && link.via.textContent === 'calls');
  if (callsLink) {
    var arg0link = Array.from(node.links).find(link => link.from === node && link.via.textContent === 'arg0');
    if (arg0link) {
      var arg1link = Array.from(node.links).find(link => link.from === node && link.via.textContent === 'arg1');
      if (arg1link) {
        return callsLink.to.textContent + '(' + compileJson(arg0link.to) + ',' + compileJson(arg1link.to) + ')';
      } else {
        return callsLink.to.textContent + '(' + compileJson(arg0link.to) + ')';
      }
    } else {
      return callsLink.to.textContent + '()';
    }
  }

  var evalLink = Array.from(node.links).find(link => link.from === node && link.via.textContent === 'eval');
  if (evalLink) {
    return evalLink.to.textContent;
  }

  var valueLink = Array.from(node.links).find(link => link.from === node && link.via.textContent === ':');
  if (valueLink) {
    return compileJson(node);
  }

  return node.textContent;
}

function compileJson(node) {
  var siblingLink = Array.from(node.links).find(link => link.from === node && link.via.textContent === ',');
  var valueLink = Array.from(node.links).find(link => link.from === node && link.via.textContent === ':');
  if (!siblingLink && !valueLink) {
    return node.textContent;
  }
  return '{' + Array.from(followListNodes(node, ',')).map(keyNode => {
    var valueLink = Array.from(keyNode.links).find(link => link.from === keyNode && link.via.textContent === ':');
    if (valueLink) {
      return "'" + keyNode.textContent + "':" + compileJson(valueLink.to);
    } else {
      return "'" + keyNode.textContent + "':undefined";
    }
  }).join(',') + '}';
}

function makeJsonGraph(json, position) {
  var firstKeyNode = null;
  var previousKeyNode = null;
  for (var key in json) {
    var keyNode = null;
    if (typeof json[key] === 'object') {
      keyNode = createNode(position, key);
      var valueViaNode = createNode({x: position.x + 150, y: position.y}, ':');
      valueViaNode.classList.add('selected');
      position.x += 300;
      var valueNode = makeJsonGraph(json[key], position);
      if (!valueNode) {
        valueNode = createNode({x: position.x, y: position.y}, json[key]);
      }
      valueNode.classList.add('selected');
      position.x -= 300;
      var valueLink = createLink({from: keyNode, via: valueViaNode, to: valueNode});
      layoutLink(valueLink);
    } else {
      keyNode = createNode(position, key);
      var valueViaNode = createNode({x: position.x + 150, y: position.y}, ':');
      var valueText = json[key];
      if (typeof json[key] === 'string') {
        valueText = "'" + json[key] + "'";
      }
      var valueNode = createNode({x: position.x + 300, y: position.y}, valueText);
      var valueLink = createLink({from: keyNode, via: valueViaNode, to: valueNode});
      valueViaNode.classList.add('selected');
      valueNode.classList.add('selected');
      layoutLink(valueLink);
      position.y += 170;
    }
    keyNode.classList.add('selected');
    if (keyNode && previousKeyNode) {
      var nextKeyViaNode = createNode({x: position.x - 100, y: parseFloat(previousKeyNode.style.top) + 85}, ',');
      nextKeyViaNode.classList.add('selected');
      var nextKeyLink = createLink({from: previousKeyNode, via: nextKeyViaNode, to: keyNode});
      layoutLink(nextKeyLink);
    }
    if (!firstKeyNode) firstKeyNode = keyNode;
    previousKeyNode = keyNode;
  }
  return firstKeyNode;
}

function layoutLink(link, lastPosition) {
  function pos(node) {
    return parseFloat(node.style.left) + ',' + parseFloat(node.style.top);
  }
  if (link.to) {
    link.setAttribute('points', [pos(link.from), pos(link.via), pos(link.to)].join(' '));
  } else if (link.via) {
    link.setAttribute('points', [pos(link.from), pos(link.via), lastPosition.x + ',' + lastPosition.y].join(' '));
  } else {
    link.setAttribute('points', [pos(link.from), lastPosition.x + ',' + lastPosition.y].join(' '));
  }
}

// Node linking
document.addEventListener('contextmenu', event => event.preventDefault());
body.addEventListener('mousedown', event => {
  if (event.button === 0 && event.shiftKey) {
    event.preventDefault();
    var node = createNode({x: event.pageX, y: event.pageY});
    Array.from(document.getElementsByClassName('selected')).forEach(node => {node.classList.remove('selected')});
    node.classList.add('selected');
    return false;
  } else if (event.button === 2 && event.target.classList.contains('node')) {
    event.preventDefault();
    var link = createLink();
    cursorOnMousedownPosition = {x: event.pageX, y: event.pageY};
    link.from = event.target;
    function handleMousemove(event) {
      layoutLink(link, {x: event.pageX, y: event.pageY});
    }
    function handleMouseover(event) {
      if (event.target.classList.contains('node') && event.target !== link.via && event.target !== link.to && event.target !== link.from) {
        if (!link.via) {
          link.via = event.target;
        } else {
          link.to = event.target;
          window.removeEventListener('mousemove', handleMousemove);
          window.removeEventListener('mouseover', handleMouseover);
          layoutLink(link);
          link.from.links.add(link);
          link.via.links.add(link);
          link.to.links.add(link);
        }
      }
    }
    function handleMouseup(event) {
      if (!(link.from && link.via && link.to)) {
        link.remove();
      }
      window.removeEventListener('mousemove', handleMousemove);
      window.removeEventListener('mouseover', handleMouseover);
      window.removeEventListener('mouseup', handleMouseup);
    }
    window.addEventListener('mousemove', handleMousemove);
    window.addEventListener('mouseover', handleMouseover);
    window.addEventListener('mouseup', handleMouseup);
    return false;
  } else if (event.target.classList.contains('node')) {
    handleNodeMousedown(event);
  } else if (event.target.classList.contains('link')) {
    Array.from(document.getElementsByClassName('selected')).forEach(element => {element.classList.remove('selected')});
    event.target.classList.add('selected');
  } else {
    handleBackgroundMousedownForSelectionBox(event);
  }
});

function saveState() {
  var id = 0;
  Array.from(document.getElementsByClassName('node')).forEach(node => {
    node.id = id;
    id = id + 1;
  });
  Array.from(document.getElementsByClassName('link')).forEach(link => {
    link.id = id;
    id = id + 1;
    link.setAttribute('data-from', link.from.id);
    link.setAttribute('data-via',  link.via.id);
    link.setAttribute('data-to',   link.to.id);
  });
  Array.from(document.getElementsByClassName('node')).forEach(node => {
    node.setAttribute('data-links', Array.from(node.links).map(function(link) {
      return link.id;
    }).join(','));
    node.setAttribute('data-instances', Array.from(node.instances).map(node => node.id).join(','));
  });
  localStorage.saved_state = document.getElementsByTagName('body')[0].innerHTML;
}

function restoreState() {
  document.getElementsByTagName('body')[0].innerHTML = localStorage.saved_state;
  Array.from(document.getElementsByClassName('link')).forEach(link => {
    link.from = document.getElementById(link.getAttribute('data-from'));
    link.via  = document.getElementById(link.getAttribute('data-via'));
    link.to   = document.getElementById(link.getAttribute('data-to'));
  });
  Array.from(document.getElementsByClassName('node')).forEach(node => {
    if (node.getAttribute('data-links')) {
      node.links = new Set(node.getAttribute('data-links').split(',').map(id => document.getElementById(id)));
    } else {
      node.links = new Set();
    }
    node.instances = new Set(node.getAttribute('data-instances').split(',').map(id => document.getElementById(id)));
  });
}
