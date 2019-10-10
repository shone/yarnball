'use strict';

const commands = {
  move_cursor_left_block:               ['HOME',              event => moveCursorToBlockEdge('left')],
  move_cursor_right_block:              ['END',               event => moveCursorToBlockEdge('right')],
  move_cursor_left_block_select:        ['ShiftHOME',         event => moveCursorToBlockEdge('left',  {dragSelectionBox: true})],
  move_cursor_right_block_select:       ['ShiftEND',          event => moveCursorToBlockEdge('right', {dragSelectionBox: true})],
  move_cursor_origin:                   ['CtrlHOME',          event => setCursorPosition({x: 0, y: 0})],

  create_node_down:                     ['ENTER',             event => selectNameMatchOrInsertNodeDown()],
  create_node_right:                    [' ',                 event => insertNodeAtCursor({moveAdjacent: 'right'})],
 
  select_all:                           ['CtrlA',             event => selectAll()],
  deselect_all:                         ['CtrlShiftA',        event => deselectAll()],
  select_connected_at_cursor:           ['CtrlG',             event => selectConnectedNodesAtCursor()],
  select_connected_instances_at_cursor: ['CtrlI',             event => selectInstancesOfNodeAtCursor({onlyConnectedNodes: true})],
  select_instances_at_cursor:           ['CtrlShiftI',        event => selectInstancesOfNodeAtCursor()],
 
  copy:                                 ['CtrlC',             event => selectionToClipboard()],
  cut:                                  ['CtrlX',             event => selectionToClipboard({cut: true})],
 
  open_find_panel:                      ['CtrlF',             event => openFindPanel()],
  select_queried_nodes:                 ['CtrlENTER',         event => moveSelectionToQueriedNodes()],
 
  move_cursor_left:                     ['ARROWLEFT',         event => moveCursorInDirection('left')],
  move_cursor_right:                    ['ARROWRIGHT',        event => moveCursorInDirection('right')],
  move_cursor_up:                       ['ARROWUP',           event => moveCursorInDirection('up')],
  move_cursor_down:                     ['ARROWDOWN',         event => moveCursorInDirection('down')],

  move_cursor_left_select:              ['ShiftARROWLEFT',    event => moveCursorInDirection('left',  {dragSelectionBox: true})],
  move_cursor_right_select:             ['ShiftARROWRIGHT',   event => moveCursorInDirection('right', {dragSelectionBox: true})],
  move_cursor_up_select:                ['ShiftARROWUP',      event => moveCursorInDirection('up',    {dragSelectionBox: true})],
  move_cursor_down_select:              ['ShiftARROWDOWN',    event => moveCursorInDirection('down',  {dragSelectionBox: true})],

  move_selection_left:                  ['CtrlARROWLEFT',     event => moveSelectionInDirection('left')],
  move_selection_right:                 ['CtrlARROWRIGHT',    event => moveSelectionInDirection('right')],
  move_selection_up:                    ['CtrlARROWUP',       event => moveSelectionInDirection('up')],
  move_selection_down:                  ['CtrlARROWDOWN',     event => moveSelectionInDirection('down')],

  create_instance_left:                 ['CtrlAltARROWLEFT',  event => createInstanceInDirection('left')],
  create_instance_right:                ['CtrlAltARROWRIGHT', event => createInstanceInDirection('right')],
  create_instance_up:                   ['CtrlAltARROWUP',    event => createInstanceInDirection('up')],
  create_instance_down:                 ['CtrlAltARROWDOWN',  event => createInstanceInDirection('down')],
 
  move_view_left:                       ['AltARROWLEFT',      event => scrollMainSurfaceInDirection('left')],
  move_view_right:                      ['AltARROWRIGHT',     event => scrollMainSurfaceInDirection('right')],
  move_view_up:                         ['AltARROWUP',        event => scrollMainSurfaceInDirection('up')],
  move_view_down:                       ['AltARROWDOWN',      event => scrollMainSurfaceInDirection('down')],
 
  delete:                               ['DELETE',            event => deleteSelection()],
  backspace:                            ['BACKSPACE',         event => backspace(event)],
  cancel:                               ['ESCAPE',            event => cancelCurrentModeOrOperation()],

  execute_link_mode:                    ['TAB',               event => executeLinkMode()],

  select_name_match_up:                 ['PAGEUP',            event => moveNameMatchSelection('previous')],
  select_name_match_down:               ['PAGEDOWN',          event => moveNameMatchSelection('next')],

  save:                                 ['CtrlS',             event => save()],
  download:                             ['CtrlShiftS',        event => download()],

  undo:                                 ['CtrlZ',             event => undo()],
  redo:                                 ['CtrlShiftZ',        event => redo()],
 
  make_unique:                          ['CtrlD',             event => makeNodeAtCursorUnique()],

  isolate_selection:                    ['CtrlE',             event => isolateSelection()],

  log_html:                             ['F6',                event => transpileHtmlAtCursor()],
  launch_html:                          ['F7',                event => launchHtmlAtCursor()],

  log_js_source:                        ['F8',                event => runJavascriptAtCursor()],
}

const keyboard_handlers = {};
for (let name in commands) {
  const [key, handler] = commands[name];
  keyboard_handlers[key] = handler;
}

const commandsPanel = document.querySelector('.panel[data-panel="commands"]');
commandsPanel.addEventListener('mousedown', event => {
  event.preventDefault();
  return false;
});
commandsPanel.addEventListener('click', event => {
  event.preventDefault();
  const tr = event.target.closest('tr');
  if (tr && tr.dataset.command in commands) {
    commands[tr.dataset.command][1]();
  }
  return false;
});

document.body.addEventListener('keydown', event => {
  const keyWithModifiers = (event.ctrlKey  ? 'Ctrl'  : '') +
                           (event.altKey   ? 'Alt'   : '') +
                           (event.shiftKey ? 'Shift' : '') +
                           event.key.toUpperCase();
  if (keyWithModifiers in keyboard_handlers) {
    event.preventDefault();
    if (isActionInProgress) {
      return false;
    }
    keyboard_handlers[keyWithModifiers](event);
    return false;
  }
});

document.addEventListener('keypress', event => {
  if ((!document.activeElement || document.activeElement.tagName !== 'INPUT') && event.key !== ' ') {
    const newNode = createNode({position: {x: pxToGridX(parseInt(cursor.style.left)), y: pxToGridY(parseInt(cursor.style.top))}});
    newNode.focus();
    selectionBox.classList.add('hidden');
    const createdElements = [newNode];
    if (linkBeingCreated) {
      const createdLink = useNodeForLinkCreationMode(newNode);
      if (createdLink) {
        createdElements.push(createdLink);
      }
    }
    recordAction(new createElementsAction(createdElements));
    return false;
  }
});
