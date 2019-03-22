'use strict';

var keyboard_handler = {
  HOME:       event => moveCursorToBlockEdge('left'),
  END:        event => moveCursorToBlockEdge('right'),
  ShiftHOME:  event => moveCursorToBlockEdge('left',  {dragSelectionBox: true}),
  ShiftEND:   event => moveCursorToBlockEdge('right', {dragSelectionBox: true}),
  CtrlHOME:   event => setCursorPosition({x: 0, y: 0}),

  ENTER:      event => {
    if (nameMatchPanel.parentElement) {
      applyCurrentNameMatchSelection();
    } else {
      insertNodeAtCursor({moveAdjacent: 'down' });
    }
  },
  ShiftENTER: event => insertNodeAtCursor({moveAdjacent: 'up'   }),
  ' ':        event => insertNodeAtCursor({moveAdjacent: 'right'}),

  CtrlA:      event => selectAll(),
  CtrlShiftA: event => deselectAll(),
  CtrlG:      event => selectConnectedNodesAtCursor(),
  CtrlI:      event => selectInstancesOfNodeAtCursor({onlyConnectedNodes: true}),
  CtrlShiftI: event => selectInstancesOfNodeAtCursor(),

  CtrlC:      event => selectionToClipboard(),
  CtrlX:      event => selectionToClipboard({cut: true}),

  CtrlF:      event => openFindPanel(),
  CtrlENTER:  event => moveSelectionToQueriedNodes(),

  ARROWLEFT:   event => moveCursorInDirection('left'),
  ARROWRIGHT:  event => moveCursorInDirection('right'),
  ARROWUP:     event => moveCursorInDirection('up'),
  ARROWDOWN:   event => moveCursorInDirection('down'),

  ShiftARROWLEFT:   event => moveCursorInDirection('left',  {dragSelectionBox: true}),
  ShiftARROWRIGHT:  event => moveCursorInDirection('right', {dragSelectionBox: true}),
  ShiftARROWUP:     event => moveCursorInDirection('up',    {dragSelectionBox: true}),
  ShiftARROWDOWN:   event => moveCursorInDirection('down',  {dragSelectionBox: true}),

  CtrlARROWLEFT:  event => moveSelectionInDirection('left'),
  CtrlARROWRIGHT: event => moveSelectionInDirection('right'),
  CtrlARROWUP:    event => moveSelectionInDirection('up'),
  CtrlARROWDOWN:  event => moveSelectionInDirection('down'),

  CtrlAltARROWDOWN:  event => createInstanceInDirection('down'),
  CtrlAltARROWRIGHT: event => createInstanceInDirection('right'),
  CtrlAltARROWUP:    event => createInstanceInDirection('up'),
  CtrlAltARROWLEFT:  event => createInstanceInDirection('left'),

  AltARROWLEFT:   event => scrollMainSurfaceInDirection('left'),
  AltARROWRIGHT:  event => scrollMainSurfaceInDirection('right'),
  AltARROWUP:     event => scrollMainSurfaceInDirection('up'),
  AltARROWDOWN:   event => scrollMainSurfaceInDirection('down'),

  DELETE:     event => deleteSelection(),
  BACKSPACE:  event => backspace(event),
  ESCAPE:     event => cancelCurrentModeOrOperation(),

  TAB:        event => executeLinkMode(),

  PAGEUP:     event => moveNameMatchSelection('previous'),
  PAGEDOWN:   event => moveNameMatchSelection('next'),

  CtrlS:      event => saveToLocalStorage(),
  CtrlShiftS: event => download(),

  CtrlZ:      event => undo(),
  CtrlShiftZ: event => redo(),

  CtrlD: event => makeNodeAtCursorUnique(),
  CtrlE: event => isolateSelection(),

  F1: event => toggleHelp(),

  F6: event => transpileHtmlAtCursor(),
  F7: event => launchHtmlAtCursor(),

  F8:  event => logJsSourceAtCursor(),
  F9:  event => logJsAtCursor(),
  F10: event => runJsAtCursor(),
}

document.body.addEventListener('keydown', event => {

  var keyWithModifiers = (event.ctrlKey  ? 'Ctrl'  : '') +
                         (event.altKey   ? 'Alt'   : '') +
                         (event.shiftKey ? 'Shift' : '') +
                         event.key.toUpperCase();
  if (keyWithModifiers in keyboard_handler) {
    event.preventDefault();
    if (isActionInProgress) {
      return false;
    }
    keyboard_handler[keyWithModifiers](event);
    return false;
  }
});

document.addEventListener('keypress', event => {
  if ((!document.activeElement || document.activeElement.tagName !== 'INPUT') && event.key !== ' ') {
    var newNode = createNode({position: {x: pxToGridX(parseInt(cursor.style.left)), y: pxToGridY(parseInt(cursor.style.top))}});
    newNode.focus();
    selectionBox.classList.add('hidden');
    var createdElements = [newNode];
    if (linkBeingCreated) {
      var createdLink = useNodeForLinkCreationMode(newNode);
      if (createdLink) {
        createdElements.push(createdLink);
      }
    }
    recordAction(new createElementsAction(createdElements));
    return false;
  }
});
