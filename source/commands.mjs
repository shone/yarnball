import * as undo_redo from './undo_redo.mjs';

import {
  mainSurface,
  currentSurface,
  pxToGridX,
  pxToGridY,
  cursor,
  selectionBox,
  linkBeingCreated,
  openFindPanel,
  moveSelectionToQueriedNodes,
  save,
  download,
  useNodeForLinkCreationMode,
  executeLinkMode,
  cancelCurrentModeOrOperation
} from './main.mjs';

const commands = {
  move_cursor_left_block:               ['HOME',              event => currentSurface.moveCursorToBlockEdge('left')],
  move_cursor_right_block:              ['END',               event => currentSurface.moveCursorToBlockEdge('right')],
  move_cursor_left_block_select:        ['ShiftHOME',         event => currentSurface.moveCursorToBlockEdge('left',  {dragSelectionBox: true})],
  move_cursor_right_block_select:       ['ShiftEND',          event => currentSurface.moveCursorToBlockEdge('right', {dragSelectionBox: true})],
  move_cursor_origin:                   ['CtrlHOME',          event => currentSurface.setCursorPosition({x: 0, y: 0})],

  create_node_down:                     ['ENTER',             event => currentSurface.selectNameMatchOrInsertNodeDown()],
  create_node_right:                    [' ',                 event => currentSurface.insertNodeAtCursor({moveAdjacent: 'right'})],

  select_all:                           ['CtrlA',             event => currentSurface.selectAll()],
  deselect_all:                         ['CtrlShiftA',        event => currentSurface.deselectAll()],
  select_connected_at_cursor:           ['CtrlG',             event => currentSurface.selectConnectedNodesAtCursor()],
  select_connected_instances_at_cursor: ['CtrlI',             event => currentSurface.selectInstancesOfNodeAtCursor({onlyConnectedNodes: true})],
  select_instances_at_cursor:           ['CtrlShiftI',        event => currentSurface.selectInstancesOfNodeAtCursor()],

  copy:                                 ['CtrlC',             event => currentSurface.selectionToClipboard()],
  cut:                                  ['CtrlX',             event => currentSurface.selectionToClipboard({cut: true})],

  open_find_panel:                      ['CtrlF',             event => openFindPanel()],
  select_queried_nodes:                 ['CtrlENTER',         event => moveSelectionToQueriedNodes()],

  move_cursor_left:                     ['ARROWLEFT',         event => currentSurface.moveCursorInDirection('left')],
  move_cursor_right:                    ['ARROWRIGHT',        event => currentSurface.moveCursorInDirection('right')],
  move_cursor_up:                       ['ARROWUP',           event => currentSurface.moveCursorInDirection('up')],
  move_cursor_down:                     ['ARROWDOWN',         event => currentSurface.moveCursorInDirection('down')],

  move_cursor_left_select:              ['ShiftARROWLEFT',    event => currentSurface.moveCursorInDirection('left',  {dragSelectionBox: true})],
  move_cursor_right_select:             ['ShiftARROWRIGHT',   event => currentSurface.moveCursorInDirection('right', {dragSelectionBox: true})],
  move_cursor_up_select:                ['ShiftARROWUP',      event => currentSurface.moveCursorInDirection('up',    {dragSelectionBox: true})],
  move_cursor_down_select:              ['ShiftARROWDOWN',    event => currentSurface.moveCursorInDirection('down',  {dragSelectionBox: true})],

  move_selection_left:                  ['CtrlARROWLEFT',     event => currentSurface.moveSelectionInDirection('left')],
  move_selection_right:                 ['CtrlARROWRIGHT',    event => currentSurface.moveSelectionInDirection('right')],
  move_selection_up:                    ['CtrlARROWUP',       event => currentSurface.moveSelectionInDirection('up')],
  move_selection_down:                  ['CtrlARROWDOWN',     event => currentSurface.moveSelectionInDirection('down')],

  create_instance_left:                 ['CtrlAltARROWLEFT',  event => currentSurface.createInstanceInDirection('left')],
  create_instance_right:                ['CtrlAltARROWRIGHT', event => currentSurface.createInstanceInDirection('right')],
  create_instance_up:                   ['CtrlAltARROWUP',    event => currentSurface.createInstanceInDirection('up')],
  create_instance_down:                 ['CtrlAltARROWDOWN',  event => currentSurface.createInstanceInDirection('down')],

  move_view_left:                       ['AltARROWLEFT',      event => mainSurface.scrollInDirection('left')],
  move_view_right:                      ['AltARROWRIGHT',     event => mainSurface.scrollInDirection('right')],
  move_view_up:                         ['AltARROWUP',        event => mainSurface.scrollInDirection('up')],
  move_view_down:                       ['AltARROWDOWN',      event => mainSurface.scrollInDirection('down')],

  delete:                               ['DELETE',            event => deleteSelection()],
  backspace:                            ['BACKSPACE',         event => backspace(event)],
  cancel:                               ['ESCAPE',            event => cancelCurrentModeOrOperation()],

  execute_link_mode:                    ['TAB',               event => executeLinkMode()],

  select_name_match_up:                 ['PAGEUP',            event => moveNameMatchSelection('previous')],
  select_name_match_down:               ['PAGEDOWN',          event => moveNameMatchSelection('next')],

  save:                                 ['CtrlS',             event => save()],
  download:                             ['CtrlShiftS',        event => download()],

  undo:                                 ['CtrlZ',             event => undo_redo.undo()],
  redo:                                 ['CtrlShiftZ',        event => undo_redo.redo()],

  make_unique:                          ['CtrlD',             event => currentSurface.makeNodeAtCursorUnique()],

  isolate_selection:                    ['CtrlE',             event => currentSurface.isolateSelection()],

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
    if (undo_redo.isActionInProgress) {
      return false;
    }
    keyboard_handlers[keyWithModifiers](event);
    return false;
  }
});

document.addEventListener('keypress', event => {
  if ((!document.activeElement || document.activeElement.tagName !== 'INPUT') && event.key !== ' ') {
    const newNode = currentSurface.createNode({position: {x: pxToGridX(parseInt(cursor.style.left)), y: pxToGridY(parseInt(cursor.style.top))}});
    newNode.focus();
    selectionBox.classList.add('hidden');
    const createdElements = [newNode];
    if (linkBeingCreated) {
      const createdLink = useNodeForLinkCreationMode(newNode);
      if (createdLink) {
        createdElements.push(createdLink);
      }
    }
    undo_redo.markElementsCreated(createdElements);
    return false;
  }
});
