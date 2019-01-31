var keyboard_handler = {
  HOME:       event => setCursorPosition({x: 0, y: 0}),

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
  ESCAPE:     event => cancelCurrentModeOrOperation(),

  TAB:        event => executeLinkMode(),

  PAGEUP:     event => moveNameMatchSelection('previous'),
  PAGEDOWN:   event => moveNameMatchSelection('next'),

  CtrlS:      event => localStorage.saved_state = getNodesAndLinksAsHtml(),
  CtrlShiftS: event => {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(getNodesAndLinksAsHtml()));
    element.setAttribute('download', '');
    element.style.display = 'none';

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element); 
  },

  CtrlZ:      event => undo(),
  CtrlShiftZ: event => redo(),

  CtrlD: event => makeNodeAtCursorUnique(),

  F1: event => toggleHelp(),

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

  if (event.key === 'F8') {
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      console.log(compileStatements(document.activeElement));
    }
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
