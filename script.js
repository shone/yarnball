if (localStorage.saved_state) {
  restoreState();
}

var body = document.getElementsByTagName('body')[0];
var linksSvg = document.getElementById('links-svg');

var cursorOnMousedownPosition = {x: 0, y: 0};
var lastCursorPosition = {x: 0, y: 0};

function findLinkVia(node, via) {
  return Array.from(node.links).find(link => link.from === node && link.via.textContent === via);
}

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

function createNode(position, text) {
  var node = document.createElement('div');
  node.classList.add('node');
  node.textContent = text;
  node.setAttribute('tabindex', '0');
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
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      doArrayLayout(document.activeElement, event.target);
    }
  } else if (event.button === 0) {
    event.preventDefault();
    event.stopPropagation();
    event.target.focus();
    var clickedNodes = new Set([event.target]);
    if (event.target.classList.contains('collapsed')) {
      var collapsedNodes = getCollapsedNodes(event.target.collapsedLink);
      collapsedNodes.forEach(node => {clickedNodes.add(node)});
    }
    if (event.shiftKey) {
      clickedNodes.forEach(node => {node.classList.toggle('selected')});
    } else {
      if (!event.target.classList.contains('selected')) {
        Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
      }
      clickedNodes.forEach(node => {node.classList.add('selected')});
    }
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
    layoutLink(link);
  });
}

body.addEventListener('dblclick', (event) => {
  if (event.target.classList.contains('node')) {
    event.target.instances.forEach(node => {
      if (!node.classList.contains('hidden')) {
        node.classList.add('selected')
      }
    });
  } else if (event.target.classList.contains('link')) {
    if (!event.target.classList.contains('collapsed')) {
      var connectedLinks = new Set([event.target]);
      var connectedNodes = new Set([event.target.from, event.target.via, event.target.to]);
      getAllConnectedNodesAndLinks(event.target.to, connectedNodes, connectedLinks);
      connectedNodes.delete(event.target.from);
      connectedNodes.forEach(node => {node.classList.add('selected')});
    }
  }
});

// Selection box
var selectionBox = document.getElementById("selection-box");
var selectionBoxPosition = {left: 0, top: 0, right: 0, bottom: 0};
function updateSelectionBox() {
  selectionBox.style.left   =  selectionBoxPosition.left   + 'px';
  selectionBox.style.top    =  selectionBoxPosition.top    + 'px';
  selectionBox.style.width  = (selectionBoxPosition.right  - selectionBoxPosition.left) + 'px';
  selectionBox.style.height = (selectionBoxPosition.bottom - selectionBoxPosition.top)  + 'px';
}
var selectedNodesToPreserve = null;
function handleBackgroundMousedownForSelectionBox(event) {
  if (event.target.tagName !== 'BODY') return;
  event.preventDefault();
  if (!event.shiftKey) {
    Array.from(document.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
    if (document.activeElement) document.activeElement.blur();
  } else {
    selectedNodesToPreserve = new Set(Array.from(document.getElementsByClassName('selected')));
  }
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
  selectedNodesToPreserve = null;
}
function handleBackgroundMousemove(event) {
  selectionBoxPosition.left   = Math.min(cursorOnMousedownPosition.x, event.pageX);
  selectionBoxPosition.top    = Math.min(cursorOnMousedownPosition.y, event.pageY);
  selectionBoxPosition.right  = Math.max(cursorOnMousedownPosition.x, event.pageX);
  selectionBoxPosition.bottom = Math.max(cursorOnMousedownPosition.y, event.pageY);
  updateSelectionBox();
  var visibleNodes = Array.from(document.getElementsByClassName('node')).filter(node => !node.classList.contains('hidden'));
  visibleNodes.forEach((node) => {
    if (selectedNodesToPreserve && selectedNodesToPreserve.has(node)) return;
    var inSelectionBox = !(
      ((parseFloat(node.style.left) + (node.offsetWidth  - 25)) < selectionBoxPosition.left)  ||
      ((parseFloat(node.style.left) - 25)                       > selectionBoxPosition.right) ||
      ((parseFloat(node.style.top)  + (node.offsetHeight - 25)) < selectionBoxPosition.top)   ||
      ((parseFloat(node.style.top)  - 25)                       > selectionBoxPosition.bottom)
    );
    if (node.collapsedLink) {
      getCollapsedNodes(node.collapsedLink).forEach(node => {node.classList.toggle('selected', inSelectionBox)});
    } else {
      node.classList.toggle('selected', inSelectionBox);
    }
  });
}

// Node renaming
var renameInput = null;
body.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    if (!renameInput) {
      if (document.activeElement && document.activeElement.classList.contains('node')) {
        renameInput = document.createElement('input');
        renameInput.value = document.activeElement.textContent;
        document.activeElement.textContent = '';
        renameInput.select();
        document.activeElement.appendChild(renameInput);
        renameInput.focus();
      }
    } else {
      renameInput.parentElement.focus();
      renameInput.parentElement.instances.forEach(node => {node.textContent = renameInput.value});
      renameInput.remove();
      renameInput = null;
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
        element.instances.delete(element);
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
  } else if (event.key === 'g') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      console.log(compileStatements(document.activeElement));
    }
  } else if (event.key === 'f') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      var f = new Function([], compileStatements(document.activeElement));
      var returnValue = f();
      if (typeof returnValue !== 'undefined') {
        if (typeof returnValue.then === 'function') {
          returnValue.then(promisedValue => {
            if (typeof promisedValue === 'object') {
              document.activeElement.classList.remove('selected');
              makeJsonGraph(promisedValue, {x: parseFloat(document.activeElement.style.left), y: parseFloat(document.activeElement.style.top)});
            }
          });
        } else if (typeof returnValue === 'object') {
          document.activeElement.classList.remove('selected');
          makeJsonGraph(returnValue, {x: parseFloat(document.activeElement.style.left), y: parseFloat(document.activeElement.style.top)});
        }
      }
    }
  } else if (event.key === 'h') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      var html = compileHtml(document.activeElement);
      var iFrame = document.createElement('iframe');
      iFrame.src = 'data:text/html;charset=utf-8,' + encodeURI(html);
      document.body.appendChild(iFrame);
    }
  } else if (event.key === 'S' && event.shiftKey && event.ctrlKey) {
    saveState();
  } else if (event.key === 'F' && event.shiftKey && event.ctrlKey) {
    restoreState();
  } else if (event.key === '-' || event.key === '+' || event.key === '=') {
    document.querySelectorAll('.link.selected').forEach(link => {
      var connectedLinks = new Set([link]);
      var connectedNodes = new Set([link.from, link.via, link.to]);
      getAllConnectedNodesAndLinks(link.to, connectedNodes, connectedLinks);
      connectedLinks.delete(link);
      connectedNodes.delete(link.from);
      connectedNodes.delete(link.via);
      connectedNodes.forEach(node => {node.classList.toggle('hidden', event.key === '-')});
      connectedLinks.forEach(link => {link.classList.toggle('hidden', event.key === '-')});
      link.via.classList.toggle('collapsed', event.key === '-');
      link.classList.toggle('collapsed', event.key === '-');
      if (event.key === '-') {
        link.via.collapsedLink = link;
      } else {
        link.via.collapsedLink = null;
      }
      layoutLink(link);
    });
  }
});

function getCollapsedNodes(collapsedLink) {
  var connectedLinks = new Set([collapsedLink]);
  var connectedNodes = new Set([collapsedLink.from, collapsedLink.via, collapsedLink.to]);
  getAllConnectedNodesAndLinks(collapsedLink.to, connectedNodes, connectedLinks);
  connectedNodes.delete(collapsedLink.from);
  return connectedNodes;
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

function layoutLink(link, lastPosition) {
  function pos(node) {
    return parseFloat(node.style.left) + ',' + parseFloat(node.style.top);
  }
  if (link.to) {
    if (link.classList.contains('collapsed')) {
      link.setAttribute('points', [pos(link.from), pos(link.via)].join(' '));
    } else {
      link.setAttribute('points', [pos(link.from), pos(link.via), pos(link.to)].join(' '));
    }
  } else if (link.via) {
    link.setAttribute('points', [pos(link.from), pos(link.via), lastPosition.x + ',' + lastPosition.y].join(' '));
  } else {
    link.setAttribute('points', [pos(link.from), lastPosition.x + ',' + lastPosition.y].join(' '));
  }
}

document.addEventListener('contextmenu', event => event.preventDefault());
body.addEventListener('mousedown', event => {
  if (event.button === 0 && event.ctrlKey && event.shiftKey) {
    event.preventDefault();
    var node = createNode({x: event.pageX, y: event.pageY});
    Array.from(document.getElementsByClassName('selected')).forEach(node => {node.classList.remove('selected')});
    node.classList.add('selected');
    node.focus();
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
      if (event.target.classList.contains('node') && !event.target.classList.contains('hidden') &&
        event.target !== link.via && event.target !== link.to && event.target !== link.from) {
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
  } else if (event.button === 0 && event.target.classList.contains('node')) {
    handleNodeMousedown(event);
  } else if (event.button === 0 && event.target.classList.contains('link')) {
    if (!event.shiftKey) {
      Array.from(document.getElementsByClassName('selected')).forEach(element => {element.classList.remove('selected')});
    }
    event.target.classList.add('selected');
  } else if (event.button === 1) {
    event.preventDefault();
    var lastMousePosition = {x: event.screenX, y: event.screenY};
    function handlePanMousemove(event) {
      window.scrollBy(lastMousePosition.x - event.screenX, lastMousePosition.y - event.screenY);
      lastMousePosition = {x: event.screenX, y: event.screenY};
    }
    function handlePanMouseup(event) {
      window.removeEventListener('mousemove', handlePanMousemove);
      window.removeEventListener('mouseup', handlePanMouseup);
    }
    window.addEventListener('mousemove', handlePanMousemove);
    window.addEventListener('mouseup', handlePanMouseup);
    return false;
  } else {
    handleBackgroundMousedownForSelectionBox(event);
  }
});

body.addEventListener('mouseover', event => {
  if (event.target.classList.contains('node')) {
    event.target.instances.forEach(node => node.classList.add('highlighted'));
  }
});

body.addEventListener('mouseout', event => {
  if (event.target.classList.contains('node')) {
    event.target.instances.forEach(node => node.classList.remove('highlighted'));
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
    if (node.getAttribute('data-instances')) {
      node.instances = new Set(node.getAttribute('data-instances').split(',').map(id => document.getElementById(id)));
    } else {
      node.instances = new Set([node]);
    }
    node.setAttribute('tabindex', '-1');
  });
}
