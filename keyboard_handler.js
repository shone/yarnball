var keyboard_handler = {
  HOME:       event => setCursorPosition(32, 16),

  ENTER:      event => insertNodeAtCursor({moveAdjacent: 'down' }),
  ShiftENTER: event => insertNodeAtCursor({moveAdjacent: 'up'   }),
  ' ':        event => insertNodeAtCursor({moveAdjacent: 'right'}),

  CtrlA:      event => {for (node of currentSurface.getElementsByClassName('node')) {node.classList.add('selected')   }},
  CtrlShiftA: event => {for (node of currentSurface.getElementsByClassName('node')) {node.classList.remove('selected')}},

  CtrlC:      event => selectionToClipboard(),
  CtrlX:      event => selectionToClipboard({cut: true}),

  CtrlENTER:  event => moveSelectionToQueriedNodes(),

  DELETE: event => {
    if (isDraggingNodes) return false;
    var elementsToDelete = new Set(currentSurface.getElementsByClassName('selected'));
    if (document.activeElement && document.activeElement.classList.contains('node') && document.activeElement.closest('.surface') === currentSurface) {
      elementsToDelete.add(document.activeElement);
    }
    if (elementsToDelete.size === 0) return false;
    var focusedNodePosition = null;
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      focusedNodePosition = {x: parseInt(document.activeElement.style.left), y: parseInt(document.activeElement.style.top)};
    }
    event.preventDefault();
    deleteElements(elementsToDelete);
    if (currentSurface.id === 'find-panel') doFind();
    if (focusedNodePosition) {
      var closestNode = getClosestNodeTo(focusedNodePosition, Array.from(currentSurface.getElementsByClassName('node')));
      if (closestNode) {
        setCursorPosition(
          pxToGridX(parseInt(closestNode.style.left)) - 32,
          pxToGridY(parseInt(closestNode.style.top))  - 16
        );
      }
    }
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }
  },

  TAB: event => {
    var selectedNodes = new Set(currentSurface.querySelectorAll('.node.selected'));
    if (selectedNodes.size === 3 && selectedNodes.has(document.activeElement)) {
      event.preventDefault();
      var nonFocusedNodes = selectedNodes;
      nonFocusedNodes.delete(document.activeElement);
      nonFocusedNodes = Array.from(nonFocusedNodes).sort((a, b) => {
        var fX = parseInt(document.activeElement.style.left);
        var fY = parseInt(document.activeElement.style.top);
        var aDeltaX = fX - parseInt(a.style.left);
        var aDeltaY = fY - parseInt(a.style.top);
        var bDeltaX = fX - parseInt(b.style.left);
        var bDeltaY = fY - parseInt(b.style.top);
        return (((aDeltaX*aDeltaX) + (aDeltaY*aDeltaY)) > ((bDeltaX*bDeltaX) + (bDeltaY*bDeltaY))) ? -1 : 1;
      });
      var from = nonFocusedNodes[0];
      var via = nonFocusedNodes[1]
      var to = document.activeElement;
      var link = Array.from(from.links).find(link => link.from === from && link.via === via && link.to === to);
      if (link) {
        deleteElements([link]);
      } else {
        link = createLink({from: nonFocusedNodes[0], via: nonFocusedNodes[1], to: document.activeElement});
        layoutLink(link);
      }
      if (currentSurface.id === 'find-panel') doFind();
      return false;
    } else if (selectedNodes.size === 0) {
      if (!linkBeingCreated) {
        linkBeingCreated = createLink();
        if (document.activeElement && document.activeElement.classList.contains('node')) {
          useNodeForLinkCreationMode(document.activeElement);
        }
        cursor.classList.add('insert-mode');
        resetCursorBlink();
      } else {
        if (document.activeElement && document.activeElement.classList.contains('node')) {
          useNodeForLinkCreationMode(document.activeElement);
        } else {
          cancelLinkMode();
        }
      }
    }
  },

  ESCAPE: event => {
    if (selectionBox) {
      event.preventDefault();
      selectionBox.remove();
      selectionBox = null;
      for (selected of [...currentSurface.getElementsByClassName('selected')]) {
        selected.classList.remove('selected');
      }
      return false;
    }
    if (linkBeingCreated || cursor.classList.contains('insert-mode')) {
      cancelLinkMode();
      return false;
    }
    if (!findPanel.classList.contains('hidden')) {
      event.preventDefault();
      findPanel.classList.add('hidden');
      for (highlighted of [...mainSurface.getElementsByClassName('highlighted')]) {
        highlighted.classList.remove('highlighted');
      }
      setCurrentSurface(mainSurface);
      return false;
    }
  },

  CtrlF: event => {
    findPanel.classList.remove('hidden');
    setCurrentSurface(findPanel);
    var findPanelNodes = findPanel.getElementsByClassName('nodes')[0];
    if (findPanelNodes.getElementsByClassName('node').length === 0) {
      createNode({position: {x: 64, y: 32}, parent: findPanelNodes});
    } else {
      highlightQueriedNodes();
    }
    resetCursorBlink();
    var nodeUnderCursor = getNodeUnderCursor();
    if (nodeUnderCursor) {
      nodeUnderCursor.focus();
    }
  },
}

document.body.addEventListener('keydown', event => {

  var keyWithModifiers = (event.ctrlKey  ? 'Ctrl'  : '') +
                         (event.altKey   ? 'Alt'   : '') +
                         (event.shiftKey ? 'Shift' : '') +
                         event.key.toUpperCase();
  if (keyWithModifiers in keyboard_handler) {
    event.preventDefault();
    keyboard_handler[keyWithModifiers](event);
    return false;
  }

  var arrowKeyDirections = {
    ArrowLeft:  'left',
    ArrowRight: 'right',
    ArrowUp:    'up',
    ArrowDown:  'down',
  }
  if (event.key in arrowKeyDirections) {
    if (isDraggingNodes) return false;
    if (event.altKey) {
      var scrollX = 0;
      var scrollY = 0;
      if (event.key === 'ArrowRight') scrollX += 64;
      if (event.key === 'ArrowLeft')  scrollX -= 64;
      if (event.key === 'ArrowUp')    scrollY -= 32;
      if (event.key === 'ArrowDown')  scrollY += 32;
      window.scrollBy(scrollX, scrollY);
      resetCursorBlink();
    } else if (event.ctrlKey) {
      var affectedLinks = new Set();
      var nodesToMove = new Set(currentSurface.querySelectorAll('.node.selected'));
      if (nodesToMove.size === 0) {
        var nodeUnderCursor = getNodeUnderCursor();
        if (nodeUnderCursor) {
          nodesToMove.add(nodeUnderCursor);
        }
      }
      var adjacentNodes = getAllAdjacentNodesInDirection(nodesToMove, arrowKeyDirections[event.key]);
      adjacentNodes.forEach(node => nodesToMove.add(node));
      var moveDelta = null;
      if (event.key === 'ArrowLeft')  moveDelta = {x: -64, y:   0};
      if (event.key === 'ArrowRight') moveDelta = {x:  64, y:   0};
      if (event.key === 'ArrowUp')    moveDelta = {x:   0, y: -32};
      if (event.key === 'ArrowDown')  moveDelta = {x:   0, y:  32};
      var willNodeBeMovedOutOfBounds = [...nodesToMove].find(node => {
        return parseInt(node.style.left) + moveDelta.x < 64 ||
               parseInt(node.style.top)  + moveDelta.y < 32;
      });
      if (willNodeBeMovedOutOfBounds) return false;
      cursor.style.left = (parseInt(cursor.style.left) + moveDelta.x) + 'px';
      cursor.style.top  = (parseInt(cursor.style.top)  + moveDelta.y) + 'px';
      resetCursorBlink();
      for (node of nodesToMove) {
        node.style.left = (parseInt(node.style.left) + moveDelta.x) + 'px';
        node.style.top  = (parseInt(node.style.top)  + moveDelta.y) + 'px';
        node.links.forEach(link => affectedLinks.add(link));
      }
      affectedLinks.forEach(link => layoutLink(link));
      if (selectionBox) {
        selectionBox.style.left = (parseInt(selectionBox.style.left) + moveDelta.x) + 'px';
        selectionBox.style.top  = (parseInt(selectionBox.style.top)  + moveDelta.y) + 'px';
      }
    } else {
        event.preventDefault();
        var cursorX = parseInt(cursor.style.left);
        var cursorY = parseInt(cursor.style.top);
        if (event.key === 'ArrowRight') cursorX += 64;
        if (event.key === 'ArrowLeft')  cursorX -= 64;
        if (event.key === 'ArrowDown')  cursorY += 32;
        if (event.key === 'ArrowUp')    cursorY -= 32;
        if (cursorX <= 0 || cursorY <= 0) {
          window.scroll({
            left: cursorX <= 0 ? 0 : undefined,
            top:  cursorY <= 0 ? 0 : undefined,
          });
        }
        if ((cursorX < 0) || (cursorY < 0)) return false;
        if (event.shiftKey) {
          if (!selectionBox) {
            selectionBox = document.createElement('div');
            selectionBox.id = 'selection-box';
            currentSurface.appendChild(selectionBox);
            selectionBox.anchorPosition = {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
          }
          var selectionBoxLeft   = Math.min(selectionBox.anchorPosition.x, cursorX);
          var selectionBoxTop    = Math.min(selectionBox.anchorPosition.y, cursorY);
          var selectionBoxWidth  = Math.max(64, Math.abs(selectionBox.anchorPosition.x - cursorX));
          var selectionBoxHeight = Math.max(32, Math.abs(selectionBox.anchorPosition.y - cursorY));
          var selectionBoxRight  = selectionBoxLeft + selectionBoxWidth;
          var selectionBoxBottom = selectionBoxTop  + selectionBoxHeight;
          selectionBox.style.left   = selectionBoxLeft   + 'px';
          selectionBox.style.top    = selectionBoxTop    + 'px';
          selectionBox.style.width  = selectionBoxWidth  + 'px';
          selectionBox.style.height = selectionBoxHeight + 'px';
          Array.from(currentSurface.getElementsByClassName('node')).forEach(node => {
            var nodeX = parseInt(node.style.left);
            var nodeY = parseInt(node.style.top);
            node.classList.toggle('selected', nodeX > selectionBoxLeft && nodeX < selectionBoxRight &&
                                              nodeY > selectionBoxTop  && nodeY < selectionBoxBottom);
          });
        } else if (selectionBox) {
          selectionBox.remove();
          selectionBox = null;
        }
        if (linkBeingCreated) {
          layoutLink(linkBeingCreated, {x: cursorX + 32, y: cursorY + 16});
        }
        if (!event.shiftKey) {
          Array.from(currentSurface.getElementsByClassName('selected')).forEach(element => element.classList.remove('selected'));
        }
        setCursorPosition(cursorX, cursorY);
        var nodeUnderCursor = getNodeUnderCursor();
        if (nodeUnderCursor) {
          nodeUnderCursor.focus();
          nodeUnderCursor.select();
        } else if (document.activeElement && document.activeElement.classList.contains('node')) {
          document.activeElement.blur();
        }
        return false;
    }
  }

  if (event.key === 'F8') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      console.log(compileStatements(document.activeElement));
    }
    return false;
  } else if (event.key === 'F9') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      var compiledStatements = compileStatements(document.activeElement);
      var f = null;
      if (compiledStatements.indexOf('await') !== -1) {
        var AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        f = new AsyncFunction([], compiledStatements);
      } else {
        f = new Function([], compiledStatements);
      }
      var returnValue = f();
      if (typeof returnValue !== 'undefined') {
        if (typeof returnValue.then === 'function') {
          returnValue.then(promisedValue => {
            if (typeof promisedValue === 'object') {
              document.activeElement.classList.remove('selected');
              makeJsonGraph(promisedValue, {x: parseInt(document.activeElement.style.left), y: parseInt(document.activeElement.style.top)});
            }
          });
        } else if (typeof returnValue === 'object') {
          document.activeElement.classList.remove('selected');
          makeJsonGraph(returnValue, {x: parseInt(document.activeElement.style.left), y: parseInt(document.activeElement.style.top)});
        }
      }
    }
    return false;
  } else if (event.key === 'F10') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      console.log(compileHtml(document.activeElement));
    }
    return false;
  }
});
