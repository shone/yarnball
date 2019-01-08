var cursorPositionOnMouseDragStart          = null;
var cursorPositionOffsetOnMouseDragStart    = null;
var cursorPositionOnLastDragMousemove       = null;
var cursorScreenPositionOnLastDragMousemove = null;

function handleMouseDrag(event, options) {
  cursorPositionOnMouseDragStart          = { x: event.pageX,   y: event.pageY   };
  cursorPositionOffsetOnMouseDragStart    = { x: event.offsetX, y: event.offsetY };
  cursorScreenPositionOnLastDragMousemove = { x: event.screenX, y: event.screenY };
  cursorPositionOnLastDragMousemove = cursorPositionOnMouseDragStart;
  function handleMousemove(event) {
    if (options.mousemove) {
      var position       = { x: event.pageX,   y: event.pageY   };
      var positionOffset = { x: event.offsetX, y: event.offsetY };
      var positionScreen = { x: event.screenX, y: event.screenY };
      var delta = {x: position.x - cursorPositionOnLastDragMousemove.x, y: position.y - cursorPositionOnLastDragMousemove.y};
      var deltaTotal = {x: position.x - cursorPositionOnMouseDragStart.x, y: position.y - cursorPositionOnMouseDragStart.y};
      var deltaScreen = {x: positionScreen.x - cursorScreenPositionOnLastDragMousemove.x, y: positionScreen.y - cursorScreenPositionOnLastDragMousemove.y};
      cursorPositionOnLastDragMousemove = position;
      cursorScreenPositionOnLastDragMousemove = positionScreen;
      options.mousemove({position, positionOffset, delta, deltaTotal, deltaScreen});
    }
  }
  window.addEventListener('mousemove', handleMousemove);
  window.addEventListener(
    'mouseup',
    event => {
      window.removeEventListener('mousemove', handleMousemove);
      if (options.mouseup) {
        var position   = {x: event.pageX, y: event.pageY};
        var deltaTotal = {x: position.x - cursorPositionOnMouseDragStart.x, y: position.y - cursorPositionOnMouseDragStart.y};
        options.mouseup(event, {position, deltaTotal});
      }
    },
    {once: true}
  );
}

document.body.addEventListener('mousedown', event => {
  if (event.target.classList.contains('surface')) {
    setCurrentSurface(event.target);
    setCursorPosition({
      x: pxToGridX(event.offsetX),
      y: pxToGridY(event.offsetY),
    });
  }
});

document.body.addEventListener('dblclick', event => {
  if (event.target.classList.contains('node')) {
    var instances = event.target.closest('.surface').querySelectorAll(`[data-id="${event.target.getAttribute('data-id')}"]`);
    for (instance of instances) instance.classList.add('selected');
  } else if (event.target.classList.contains('link')) {
    var connectedLinks = new Set([event.target]);
    var connectedNodes = new Set([event.target.from, event.target.via, event.target.to]);
    getAllConnectedNodesAndLinks(event.target.to, connectedNodes, connectedLinks);
    connectedNodes.delete(event.target.from);
    for (node of connectedNodes) node.classList.add('selected');
  }
});

var selectedNodesToPreserve = null;
function handleBackgroundMousedownForSelectionBox(event) {
  event.preventDefault();
  currentSurface.classList.add('dragging-selection-box');
  if (!event.shiftKey) {
    deselectAll();
    if (document.activeElement) document.activeElement.blur();
  } else {
    selectedNodesToPreserve = new Set(currentSurface.getElementsByClassName('selected'));
  }
  handleMouseDrag(event, {
    mousemove: function(cursor) {
      setSelectionBox(
        {
          left:   Math.min(pxToGridX(cursorPositionOffsetOnMouseDragStart.x), pxToGridX(cursor.positionOffset.x)),
          top:    Math.min(pxToGridY(cursorPositionOffsetOnMouseDragStart.y), pxToGridY(cursor.positionOffset.y)),
          right:  Math.max(pxToGridX(cursorPositionOffsetOnMouseDragStart.x), pxToGridX(cursor.positionOffset.x)),
          bottom: Math.max(pxToGridY(cursorPositionOffsetOnMouseDragStart.y), pxToGridY(cursor.positionOffset.y)),
        },
        selectedNodesToPreserve
      );
      selectionBox.classList.remove('hidden');
      var closestNode = getClosestNodeTo(cursor.position, [...currentSurface.querySelectorAll('.node.selected')]);
      if (closestNode) {
        closestNode.focus();
      } else {
        if (document.activeElement) document.activeElement.blur();
      }
    },
    mouseup: function() {
      selectedNodesToPreserve = null;
      currentSurface.classList.remove('dragging-selection-box');
    }
  });
  selectionBox.classList.add('hidden');
  return false;
}

function handleNodeMousedown(event) {
  if (event.button === 0) {
    event.preventDefault();
    var node = event.target;
    node.focus();
    setCursorPosition({
      x: pxToGridX(parseInt(node.style.left)),
      y: pxToGridY(parseInt(node.style.top)),
    });
    if (event.shiftKey) {
      node.classList.toggle('selected');
    } else {
      if (!node.classList.contains('selected')) {
        deselectAll();
      }
    }
    // Node dragging
    var nodesToDrag = new Set(currentSurface.querySelectorAll('.node.selected'));
    nodesToDrag.add(document.activeElement);
    for (node of nodesToDrag) {
      node.dragStartPosition = {x: parseInt(node.style.left), y: parseInt(node.style.top)};
    }
    var nodesNotBeingDragged = new Set(currentSurface.getElementsByClassName('node'));
    for (node of nodesToDrag) nodesNotBeingDragged.delete(node);
    var cursorStartPosition = {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
    var selectionBoxStartPosition = getSelectionBox();
    isActionInProgress = true;
    document.body.classList.add('dragging');
    handleMouseDrag(event, {
      mousemove: function(mouse) {
        // Check if dragging to a valid position
        for (node of [...nodesToDrag]) {
          var newNodeBoundingBox = {
            left:   node.dragStartPosition.x + pxToGridX(mouse.deltaTotal.x),
            top:    node.dragStartPosition.y + pxToGridY(mouse.deltaTotal.y),
            right:  node.dragStartPosition.x + pxToGridX(mouse.deltaTotal.x) + parseInt(node.style.width),
            bottom: node.dragStartPosition.y + pxToGridY(mouse.deltaTotal.y) + 20,
          }
          if (newNodeBoundingBox.left < 0) return;
          if (newNodeBoundingBox.top < 0) return;
          if (getNodesIntersectingBox(newNodeBoundingBox, [...nodesNotBeingDragged]).length !== 0) return;
        }
        // Move nodes
        var affectedLinks = new Set();
        for (node of nodesToDrag) {
          node.style.left = (node.dragStartPosition.x + pxToGridX(mouse.deltaTotal.x)) + 'px';
          node.style.top  = (node.dragStartPosition.y + pxToGridY(mouse.deltaTotal.y)) + 'px';
          for (link of node.links) affectedLinks.add(link);
        }
        for (link of affectedLinks) layoutLink(link);
        // Move cursor
        cursor.style.left = (cursorStartPosition.x + pxToGridX(mouse.deltaTotal.x)) + 'px';
        cursor.style.top  = (cursorStartPosition.y + pxToGridY(mouse.deltaTotal.y)) + 'px';
        resetCursorBlink();
        // Move selection box
        if (selectionBoxStartPosition) {
          selectionBox.style.left = (selectionBoxStartPosition.left + pxToGridX(mouse.deltaTotal.x)) + 'px';
          selectionBox.style.top  = (selectionBoxStartPosition.top  + pxToGridY(mouse.deltaTotal.y)) + 'px';
        }
      },
      mouseup: function(event, mouse) {
        for (node of nodesToDrag) node.classList.remove('dragging');
        if (Math.abs(mouse.deltaTotal.x) > 32 || Math.abs(mouse.deltaTotal.y) > 16) {
          var oldPositions = [...nodesToDrag].map(node => {return {node: node, left: node.dragStartPosition.x+'px', top: node.dragStartPosition.y+'px'}});
          var newPositions = [...nodesToDrag].map(node => {return {node: node, left: node.style.left, top: node.style.top}});
          recordAction(
            new moveNodesAction({oldPositions, newPositions}),
            {
              cursor: {before: cursorStartPosition, after: {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)}},
              selectionBox: {before: selectionBoxStartPosition, after: getSelectionBox()}
            }
          );
        }
        isActionInProgress = false;
        document.body.classList.remove('dragging');
      }
    });
    return false;
  }
}

document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('mousedown', event => {
  // Middle mouse button drag
  if (event.button === 1) {
    event.preventDefault();
    document.body.classList.add('dragging');
    handleMouseDrag(event, {
      mousemove: cursor => window.scrollBy(-cursor.deltaScreen.x, -cursor.deltaScreen.y),
      mouseup: event => {
        event.preventDefault();
        document.body.classList.remove('dragging');
        return false;
      }
    });
    return false;
  }

  var surface = event.target.closest('.surface');
  if (surface) {
    setCurrentSurface(surface);
  }

  // Right mouse button down on node
  if (event.button === 2 && event.target.classList.contains('node')) {
    event.preventDefault();
    var link = createLink();
    link.from = event.target;
    var fromPosition = {x: parseInt(link.from.style.left), y: parseInt(link.from.style.top)};
    handleMouseDrag(event, {
      mousemove: cursor => layoutLink(link, {x: fromPosition.x + cursor.deltaTotal.x + 32, y: fromPosition.y + cursor.deltaTotal.y + 16}),
      mouseup: function(event) {
        if (link.from && link.via && link.to) {
          recordAction(new createLinkAction(link));
        } else {
          link.remove();
        }
        window.removeEventListener('mouseover', handleMouseover);
      }
    });
    function handleMouseover(event) {
      if (event.target.classList.contains('node') && ![link.from, link.via, link.to].includes(event.target)) {
        if (!link.via) {
          link.via = event.target;
        } else if (!link.to) {
          link.to = event.target;
          window.removeEventListener('mouseover', handleMouseover);
          layoutLink(link);
          link.from.links.add(link);
          link.via.links.add(link);
          link.to.links.add(link);
        }
      }
    }
    window.addEventListener('mouseover', handleMouseover);
    return false;
  }

  // Left mouse button down on node
  if (event.button === 0 && event.target.classList.contains('node')) {
    handleNodeMousedown(event);
    return false;
  }

  // Left mouse button down on link
  if (event.button === 0 && event.target.classList.contains('link')) {
    event.preventDefault();
    if (event.shiftKey) {
      event.target.classList.toggle('selected');
    } else {
      deselectAll();
      event.target.classList.add('selected');
    }
    return false;
  }

  // Mouse button down on surface
  if (event.target.classList.contains('surface')) {
    handleBackgroundMousedownForSelectionBox(event);
  }
});

// Node instance highlighting
mainSurface.addEventListener('mouseover', event => {
  if (event.target.classList.contains('node')) {
    var instances = event.target.closest('.surface').querySelectorAll(`[data-id="${event.target.getAttribute('data-id')}"]`);
    for (instance of instances) instance.classList.add('mouse-over-instance');
    event.target.addEventListener(
      'mouseleave',
      event => {
        for (instance of instances) instance.classList.remove('mouse-over-instance')
      },
      {once: true}
    );
  }
});
