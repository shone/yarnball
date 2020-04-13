import {createNode, initNode} from './node.mjs';
import {makeUuid} from './utils.mjs';
import {mainSurface} from './main.mjs';

export function initSurface(surface) {

  const cursor         = surface.querySelector('.cursor');
  const selectionBox   = surface.querySelector('.selection-box');
  const nodesContainer = surface.querySelector('.nodes');

  // Setup overflow maps
  const surfaceContainer = surface.closest('.surface-container');
  if (surfaceContainer) {
    for (const overflowMap of surfaceContainer.getElementsByClassName('overflow-map')) {
      surface.addEventListener('scroll', event => {
        overflowMap.scrollTo(surface.scrollLeft, surface.scrollTop);
      });
      overflowMap.addEventListener('mousedown', event => {
        if (event.target.classList.contains('node-shadow')) {
          if (overflowMap.dataset.edge === 'left') {
            surface.scrollTo({left: parseInt(event.target.node.style.left), behavior: 'smooth'});
          } else if (overflowMap.dataset.edge === 'top') {
            surface.scrollTo({top: parseInt(event.target.node.style.top), behavior: 'smooth'});
          } else if (overflowMap.dataset.edge === 'right') {
            const nodeRight = parseInt(event.target.node.style.left) + parseInt(event.target.node.style.width) + 14;
            surface.scrollTo({left: nodeRight - (surfaceContainer.offsetWidth - 40), behavior: 'smooth'});
          } else if (overflowMap.dataset.edge === 'bottom') {
            const nodeBottom = parseInt(event.target.node.style.top) + 32;
            surface.scrollTo({top: nodeBottom - (surfaceContainer.offsetHeight - 40), behavior: 'smooth'});
          }
        }
      });
    }
  }

  surface.scrollInDirection = direction => {
    var scrollDelta = {
      left:  {x: -64, y:   0},
      right: {x:  64, y:   0},
      up:    {x:   0, y: -32},
      down:  {x:   0, y:  32},
    }[direction];
    surface.scrollBy(scrollDelta.x, scrollDelta.y);
  }

  surface.selectAll = () => {
    for (const node of [...surface.getElementsByClassName('node')]) {
      node.classList.add('selected');
    }
    const surfaceContainer = surface.closest('.surface-container');
    if (surfaceContainer) {
      for (const nodeShadow of [...surfaceContainer.getElementsByClassName('node-shadow')]) {
        nodeShadow.classList.add('selected');
      }
    }
    selectionBox.classList.add('hidden');
  }

  surface.deselectAll = () => {
    for (const element of [...surface.getElementsByClassName('selected')]) {
      element.classList.remove('selected');
      if (element.overflowMap) {
        for (const nodeShadow of Object.values(element.overflowMap)) {
          nodeShadow.classList.remove('selected');
        }
      }
    }
    selectionBox.classList.add('hidden');
  }

  surface.setSelectionBox = (position, selectedNodesToPreserve) => {
    if (!position.width)  position.width  = position.right  - position.left;
    if (!position.height) position.height = position.bottom - position.top;
    if (!position.right)  position.right  = position.left   + position.width;
    if (!position.bottom) position.bottom = position.top    + position.height;
    selectionBox.style.left   = position.left   + 'px';
    selectionBox.style.top    = position.top    + 'px';
    selectionBox.style.width  = position.width  + 'px';
    selectionBox.style.height = position.height + 'px';
    const intersectingNodes = new Set(getNodesIntersectingBox(position));
    for (const node of [...surface.getElementsByClassName('node')]) {
      if (selectedNodesToPreserve && selectedNodesToPreserve.has(node)) continue;
      const selected = intersectingNodes.has(node);
      node.classList.toggle('selected', selected);
      if (node.overflowMap) {
        for (const nodeShadow of Object.values(node.overflowMap)) {
          nodeShadow.classList.toggle('selected', selected);
        }
      }
    }
  }
  surface.getSelectionBox = () => {
    if (selectionBox.classList.contains('hidden')) {
      return null;
    } else {
      return {
        left:   parseInt(selectionBox.style.left),
        top:    parseInt(selectionBox.style.top),
        right:  parseInt(selectionBox.style.left) + parseInt(selectionBox.style.width),
        bottom: parseInt(selectionBox.style.top)  + parseInt(selectionBox.style.height),
        width:  parseInt(selectionBox.style.width),
        height: parseInt(selectionBox.style.height),
      }
    }
  }

  surface.createNode = (options = {}) => {
    const node = createNode(options);
    nodesContainer.appendChild(node);
    return node;
  }

  surface.getNodeAtPosition = position => {
    for (let node of surface.getElementsByClassName('node')) {
      if ((position.y === parseInt(node.style.top)) &&
        (position.x >= parseInt(node.style.left)) && (position.x < (parseInt(node.style.left) + parseInt(node.style.width)))) {
        return node;
      }
    }
    return null;
  }

  surface.getNodesIntersectingBox = (box, nodes = [...surface.getElementsByClassName('node')]) => {
    return nodes.filter(node => {
      return !(
        ((parseInt(node.style.left) + getNodeWidthForName(node.value))  <  box.left)  ||
        (parseInt(node.style.left)                                     >= box.right) ||
        ((parseInt(node.style.top)  + 20)                               <  box.top)   ||
        (parseInt(node.style.top)                                      >= box.bottom)
      );
    });
  }

  surface.getNodeClosestToPosition = (position) => {
    let closestNode = null;
    let closestDistance = null;
    for (let node of surface.getElementsByClassName('node')) {
      var deltaX = parseInt(node.style.left) - position.x;
      var deltaY = parseInt(node.style.top)  - position.y;
      var distance = (deltaX*deltaX) + (deltaY*deltaY);
      if (!closestNode || (distance < closestDistance)) {
        closestNode = node;
        closestDistance = distance;
      }
    }
    return closestNode;
  }

  function getGroupsOrganizedIntoRows(groups) {
    const rows = [];
    for (const group of groups) {
      for (const node of group) {
        const nodeY = parseInt(node.style.top);
        const row = nodeY / 32;
        rows[row] = rows[row] || [];
        rows[row].push({group, node});
      }
    }
    return rows;
  }

  function getGroupsOrganizedIntoColumns(groups) {
    const columns = [];
    for (const group of groups) {
      for (const node of group) {
        const nodeX = parseInt(node.style.left);
        const nodeWidth = parseInt(node.style.width);
        const column = nodeX / 64;
        const columnCount = pxToGridX(nodeWidth) / 64;
        for (let c=0; c < columnCount; c++) {
          columns[column+c] = columns[column+c] || [];
          columns[column+c].push({group, node});
        }
      }
    }
    return columns;
  }

  function getNodeGroups() {
    const visitedNodes = new Set();
    const groups = [];
    for (const node of [...surface.getElementsByClassName('node')]) {
      if (!visitedNodes.has(node)) {
        const group = new Set();
        const nodesToVisit = new Set([node]);
        while (nodesToVisit.size > 0) {
          const visitingNode = nodesToVisit.values().next().value;
          nodesToVisit.delete(visitingNode);
          group.add(visitingNode);
          visitedNodes.add(visitingNode);
          for (let link of visitingNode.links) {
            if (!group.has(link.from)) nodesToVisit.add(link.from);
            if (!group.has(link.via))  nodesToVisit.add(link.via);
            if (!group.has(link.to))   nodesToVisit.add(link.to);
          }
        }
        groups.push(group);
      }
    }
    return groups;
  }

  surface.getTouchingNodesInDirection = (sourceNodes, direction, nodes) => {
    if (direction === 'left' || direction === 'right') {
      const rows = getNodesOrganizedIntoRows(nodes);
      const touchingNodes = [];
      for (const row of rows) {
        if (!row) {
          continue;
        }
        if (direction === 'left') {
          row.sort((a,b) => parseInt(a.style.left) - parseInt(b.style.left));
        } else if (direction === 'right') {
          row.sort((a,b) => parseInt(b.style.left) - parseInt(a.style.left));
        }
        let lastNodeEdge = null;
        let lastNodeWasSourceNode = null;
        let currentBlock = [];
        for (const node of row) {
          var leftEdge = parseInt(node.style.left);
          var rightEdge = leftEdge + parseInt(node.style.width);
          var edge = (direction === 'left') ? leftEdge : rightEdge;
          var isSourceNode = sourceNodes.has(node);
          if (lastNodeEdge !== null && Math.abs(edge - lastNodeEdge) < 20) {
            if (isSourceNode) {
              touchingNodes.push(...currentBlock);
              currentBlock = [];
            } else {
              currentBlock.push(node);
            }
          } else {
            currentBlock = [node];
          }
          lastNodeEdge = (direction === 'left') ? rightEdge : leftEdge;
          lastNodeWasSourceNode = isSourceNode;
        }
      }
      return touchingNodes;
    } else if (direction === 'up' || direction === 'down') {
      const touchingNodes = new Set();
      const columns = getNodesOrganizedIntoColumns(nodes);
      for (const column of columns) {
        if (!column) {
          continue;
        }
        if (direction === 'up') {
          column.sort((a,b) => parseInt(b.style.top) - parseInt(a.style.top));
        } else if (direction === 'down') {
          column.sort((a,b) => parseInt(a.style.top) - parseInt(b.style.top));
        }
      }
      const maxY = Math.max(...columns.filter(column => column).map(column => parseInt((direction === 'down' ? column[column.length-1] : column[0]).style.top)));
      const rowCount = (maxY + 32) / 32;
      for (let row = 0; row < rowCount; row++) {
        const normalizedRow = direction === 'down' ? row : (rowCount - row);
        const rowPx = (normalizedRow * 32) + 'px';
        for (const column of columns) {
          if (!column) {
            continue;
          }
          const nodeIndex = column.findIndex(node => node.style.top === rowPx);
          if (nodeIndex >= 1) {
            const node     = column[nodeIndex];
            const prevNode = column[nodeIndex-1];
            if (Math.abs(parseInt(prevNode.style.top) - parseInt(node.style.top)) === 32) {
              if (sourceNodes.has(prevNode) || touchingNodes.has(prevNode)) {
                touchingNodes.add(node);
              }
            }
          }
        }
      }
      return touchingNodes;
    }
  }

  surface.getTouchingGroupsInDirection = (sourceNodes, direction, groups = getNodeGroups()) => {
    if (direction === 'left' || direction === 'right') {
      const rows = getGroupsOrganizedIntoRows(groups);

      for (const row of rows) {
        if (!row) {
          continue;
        }
        if (direction === 'left') {
          row.sort((a,b) => parseInt(a.node.style.left) - parseInt(b.node.style.left));
        } else if (direction === 'right') {
          row.sort((a,b) => parseInt(b.node.style.left) - parseInt(a.node.style.left));
        }
        let lastNodeEdge = null;
        let lastNodeGroup = null;
        for (const entry of row) {
          const leftEdge = parseInt(entry.node.style.left);
          const rightEdge = leftEdge + parseInt(entry.node.style.width);
          const edge = (direction === 'left') ? leftEdge : rightEdge;
          if (lastNodeEdge !== null && (entry.group !== lastNodeGroup)) {
            if (Math.abs(edge - lastNodeEdge) < 20) {
              entry.group.touches = entry.group.touches || new Set();
              entry.group.touches.add(lastNodeGroup);
            }
          }
          lastNodeEdge = (direction === 'left') ? rightEdge : leftEdge;
          lastNodeGroup = entry.group;
        }
      }
    } else if (direction === 'up' || direction === 'down') {
      const columns = getGroupsOrganizedIntoColumns(groups);

      for (const column of columns) {
        if (!column) {
          continue;
        }
        if (direction === 'up') {
          column.sort((a,b) => parseInt(a.node.style.top) - parseInt(b.node.style.top));
        } else if (direction === 'down') {
          column.sort((a,b) => parseInt(b.node.style.top) - parseInt(a.node.style.top));
        }
        let lastNodeEdge = null;
        let lastNodeGroup = null;
        for (const entry of column) {
          const topEdge = parseInt(entry.node.style.top);
          const bottomEdge = topEdge + 32;
          const edge = (direction === 'up') ? topEdge : bottomEdge;
          if (lastNodeEdge !== null && (entry.group !== lastNodeGroup)) {
            if (edge === lastNodeEdge) {
              entry.group.touches = entry.group.touches || new Set();
              entry.group.touches.add(lastNodeGroup);
            }
          }
          lastNodeEdge = (direction === 'up') ? bottomEdge : topEdge;
          lastNodeGroup = entry.group;
        }
      }
    }

    const sourceGroups = groups.filter(group => { for (const node of group) if (sourceNodes.has(node)) return true; });
    const visitedGroups = new Set();
    const groupsToVisit = new Set(sourceGroups);
    while (groupsToVisit.size > 0) {
      const group = groupsToVisit.values().next().value;
      groupsToVisit.delete(group);
      visitedGroups.add(group);
      if (group.touches) {
        for (const touchingGroup of group.touches) {
          if (!visitedGroups.has(touchingGroup)) {
            groupsToVisit.add(touchingGroup);
          }
        }
      }
    }
    return visitedGroups;
  }

  surface.createLink = (options = {}) => {
    const link = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    surface.getElementsByClassName('links')[0].appendChild(link);
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
    if (options.from && options.via && options.to) {
      link.classList.add('link');
    } else {
      link.classList.add('unfinished-link');
    }
    return link;
  }

  surface.layoutLink = (link, lastPosition) => {
    const points = [];
    if (link.from) {
      const nextPoint = link.via ? surface.getNodeCenter(link.via) : lastPosition;
      const anchorPoints = getNodeAnchorPoints(link.from);
      for (let anchor of anchorPoints) {
        anchor.distance = Math.pow(nextPoint.x - anchor.point.x, 2) + Math.pow(nextPoint.y - anchor.point.y, 2);
      }
      anchorPoints.sort((a, b) => a.distance - b.distance);
      points.push(anchorPoints[0].point);
    }
    if (link.via) {
      points.push(getNodeCenter(link.via));
    }
    if (link.to) {
      const viaPoint = getNodeCenter(link.via);
      const anchorPoints = getNodeAnchorPoints(link.to);
      for (let anchor of anchorPoints) {
        anchor.distance = Math.pow(viaPoint.x - anchor.point.x, 2) + Math.pow(viaPoint.y - anchor.point.y, 2);
      }
      anchorPoints.sort((a, b) => a.distance - b.distance);
      points.push(anchorPoints[0].point);
    }
    if (points.length < 3 && lastPosition) points.push(lastPosition);
    if (points.length >= 2) {
      link.setAttribute('points', points.map(point => point.x + ',' + point.y).join(' '));
    } else {
      link.setAttribute('points', '');
    }
  }

  surface.setCursorPosition = position => {
    surface.resetCursorBlink();

    if (parseInt(cursor.style.left) === position.x && parseInt(cursor.style.top) === position.y) {
      return;
    }
    if (position.x < 0 || position.y < 0) {
      throw `Invalid cursor position: {x: ${position.x}, y: ${position.y}}`;
    }

    cursor.style.left = position.x + 'px';
    cursor.style.top  = position.y + 'px';

    if (linkBeingCreated) {
      surface.layoutLink(linkBeingCreated, {x: position.x + 32, y: position.y + 16});
    }

    const nodeUnderCursor = getNodeAtCursor();

    // Highlighting
    for (const element of [...surface.getElementsByClassName('highlight-for-connected')]) {
      element.classList.remove('highlight-for-connected');
    }
    if (nodeUnderCursor) {
      const nodesToHighlight = new Set();
      for (const link of nodeUnderCursor.links) {
        link.classList.add('highlight-for-connected');
        link.parentElement.appendChild(link); // Bring to front
        nodesToHighlight.add(link.from);
        nodesToHighlight.add(link.via);
        nodesToHighlight.add(link.to);
      }
      for (const node of nodesToHighlight) {
        node.classList.add('highlight-for-connected');
      }
    }

    // Scroll into view
    if (surface === mainSurface) {
      if (nodeUnderCursor) {
        nodeUnderCursor.scrollIntoView({block: 'nearest', inline: 'nearest'});
      } else {
        cursor.scrollIntoView({block: 'nearest', inline: 'nearest'});
      }
    }

    surface.evaluateCursorPosition();

    nameMatchPanel.remove();
  }

  surface.moveCursorInDirection = (direction, options = {}) => {
    const moveDelta = {
      left:  {x: -64, y:   0},
      right: {x:  64, y:   0},
      up:    {x:   0, y: -32},
      down:  {x:   0, y:  32},
    }[direction];
    const cursorX = parseInt(cursor.style.left) + moveDelta.x;
    const cursorY = parseInt(cursor.style.top)  + moveDelta.y;
    if (surface === mainSurface && (cursorX <= 0 || cursorY <= 0)) {
      window.scroll({
        left: cursorX <= 0 ? 0 : undefined,
        top:  cursorY <= 0 ? 0 : undefined,
      });
    }
    if ((cursorX < 0) || (cursorY < 0)) return;
    if (options.dragSelectionBox) {
      if (selectionBox.classList.contains('hidden')) {
        selectionBox.anchorPosition = {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
      }
      setSelectionBox(getBoundingBoxForPoints(selectionBox.anchorPosition, {x: cursorX, y: cursorY}));
      selectionBox.classList.remove('hidden');
    } else {
      surface.deselectAll();
    }
    setCursorPosition({x: cursorX, y: cursorY});
    const nodeUnderCursor = getNodeAtCursor();
    if (nodeUnderCursor) {
      nodeUnderCursor.focus();
      nodeUnderCursor.select();
    } else if (document.activeElement && document.activeElement.classList.contains('node')) {
      document.activeElement.blur();
    }
  }

  surface.resetCursorBlink = () => {
    cursor.classList.remove('blinking');
    cursor.offsetHeight;
    cursor.classList.add('blinking');
  }

  surface.evaluateCursorPosition = () => {
    const nodeAtCursor = surface.getNodeAtCursor();
    if (nodeAtCursor) {
      nodeAtCursor.focus();
      nodeAtCursor.select();
    }
    for (const node of document.getElementsByClassName('node')) {
      const atInstance = nodeAtCursor && node.dataset.id === nodeAtCursor.dataset.id;
      node.classList.toggle('cursor-at-instance', atInstance);
      if (node.overflowMap) {
        for (const nodeShadow of Object.values(node.overflowMap)) {
          nodeShadow.classList.toggle('cursor-at-instance', atInstance);
        }
      }
    }
    document.dispatchEvent(new Event('cursorPositionEvaluated'));
  }

  surface.selectionToClipboard = (options = {}) => {
    const selectedNodes = new Set([...surface.querySelectorAll('.node.selected')]);
    if (document.activeElement && document.activeElement.classList.contains('node')) {
      selectedNodes.add(document.activeElement);
    }
    if (selectedNodes.size === 0) return;
    const affectedLinks = new Set();
    for (let node of selectedNodes) {
      for (let link of node.links) {
        if (
          selectedNodes.has(link.from) &&
          selectedNodes.has(link.via)  &&
          selectedNodes.has(link.to)
        ) affectedLinks.add(link);
      }
    }
    const html = getNodesAndLinksAsHtml(selectedNodes, affectedLinks);
    const previouslyFocusedElement = document.activeElement;
    const temporaryInput = document.createElement('input');
    temporaryInput.value = html;
    document.body.appendChild(temporaryInput);
    temporaryInput.select();
    document.execCommand('copy');
    temporaryInput.remove();
    if (options.cut) {
      // Don't delete nodes that have links to unselected nodes
      const nodesToDelete = new Set([...selectedNodes].filter(node =>
        [...node.links].every(link =>
          selectedNodes.has(link.from) &&
          selectedNodes.has(link.via)  &&
          selectedNodes.has(link.to)
        )
      ));
      if (nodesToDelete.size > 0 || affectedLinks.size > 0) {
        const elements = [...nodesToDelete, ...affectedLinks];
        deleteElements(elements);
        undo_redo.markElementsDeleted(elements);
      }
      selectionBox.classList.add('hidden');
    } else if (previouslyFocusedElement) {
      previouslyFocusedElement.focus();
    }
  }

  surface.selectConnectedNodesAtCursor = () => {
    const nodeAtCursor = surface.getNodeAtCursor();
    if (nodeAtCursor) {
      surface.deselectAll();
      for (const node of nodeAtCursor.getConnectedNodes()) {
        node.classList.add('selected');
        if (node.overflowMap) {
          for (const nodeShadow of Object.values(node.overflowMap)) {
            nodeShadow.classList.add('selected');
          }
        }
      }
    }
  }

  surface.makeNodeAtCursorUnique = () => {
    const node = surface.getNodeAtCursor();
    if (!node) {
      return;
    }
    const oldId = node.dataset.id;
    const newId = makeUuid();
    node.dataset.id = newId;
    surface.evaluateCursorPosition();
    undo_redo.markIdChanged(node, {id: oldId}, {id: newId});
  }

  surface.isolateSelection = () => {
    const selectedNodes = new Set(surface.querySelectorAll('.node.selected'));
    const linksToDelete = new Set();
    for (let node of selectedNodes) {
      for (let link of node.links) {
        if (!selectedNodes.has(link.from) ||
            !selectedNodes.has(link.via) ||
            !selectedNodes.has(link.to)) {
          linksToDelete.add(link);
        }
      }
    }
    if (linksToDelete.size > 0) {
      surface.deleteElements([...linksToDelete]);
      undo_redo.markElementsDeleted([...linksToDelete]);
    }
  }

  surface.moveSelectionInDirection = direction => {
    surface.resetCursorBlink();
    let nodesToMove = new Set(surface.querySelectorAll('.node.selected'));
    const nodeAtCursor = surface.getNodeAtCursor();
    if (nodeAtCursor) {
      nodesToMove.add(nodeAtCursor);
    }
    if (nodesToMove.size === 0) return;

    const affectedLinks = new Set();

    const groups = getNodeGroups();

    const selectedGroups = groups.filter(group => [...group].some(node => node.classList.contains('selected') || document.activeElement === node));
    const selectedGroupsNodes = [];
    for (const group of selectedGroups) {
      selectedGroupsNodes.push(...group);
    }
    const touchingNodes = surface.getTouchingNodesInDirection(nodesToMove, direction, selectedGroupsNodes);
    for (const node of touchingNodes) {
      nodesToMove.add(node);
    }

    const unselectedGroups = groups.filter(group => [...group].every(node => !node.classList.contains('selected') && document.activeElement !== node));
    for (const group of selectedGroups) {
      var newGroup = new Set();
      for (const node of group) {
        if (node.classList.contains('selected') || document.activeElement === node) {
          newGroup.add(node);
        }
      }
      unselectedGroups.push(newGroup);
    }

    const touchingGroups = surface.getTouchingGroupsInDirection(nodesToMove, direction, unselectedGroups);
    for (const group of touchingGroups) {
      if ([...group].every(node => !nodesToMove.has(node))) {
        for (const node of group) {
          nodesToMove.add(node);
        }
      }
    }
    const moveDelta = {
      left:  {x: -64, y:   0},
      right: {x:  64, y:   0},
      up:    {x:   0, y: -32},
      down:  {x:   0, y:  32},
    }[direction];
    const willNodeBeMovedOutOfBounds = [...nodesToMove].find(node => {
      return parseInt(node.style.left) + moveDelta.x < 0 ||
            parseInt(node.style.top)  + moveDelta.y < 0;
    });
    if (willNodeBeMovedOutOfBounds) return false;

    const oldPositions = [...nodesToMove].map(node => {return {node: node, left: node.style.left, top: node.style.top}});

    for (const node of nodesToMove) {
      node.style.left = (parseInt(node.style.left) + moveDelta.x) + 'px';
      node.style.top  = (parseInt(node.style.top)  + moveDelta.y) + 'px';
      node.links.forEach(link => affectedLinks.add(link));
    }
    affectedLinks.forEach(link => layoutLink(link));

    const cursorBefore = {
      x: parseInt(cursor.style.left),
      y: parseInt(cursor.style.top),
    }
    cursor.style.left = (parseInt(cursor.style.left) + moveDelta.x) + 'px';
    cursor.style.top  = (parseInt(cursor.style.top)  + moveDelta.y) + 'px';
    const cursorAfter = {
      x: parseInt(cursor.style.left),
      y: parseInt(cursor.style.top),
    }

    const selectionBoxBefore = getSelectionBox();
    selectionBox.style.left = (parseInt(selectionBox.style.left) + moveDelta.x) + 'px';
    selectionBox.style.top  = (parseInt(selectionBox.style.top)  + moveDelta.y) + 'px';
    const selectionBoxAfter = getSelectionBox();

    const newPositions = [...nodesToMove].map(node => {return {node: node, left: node.style.left, top: node.style.top}});

  //   recordAction(
      undo_redo.markNodesMoved({oldPositions, newPositions});
  //     {
  //       cursor: {before: cursorBefore, after: cursorAfter},
  //       selectionBox: {before: selectionBoxBefore, after: selectionBoxAfter}
  //     }
  //   );
  }

  surface.insertNodeAtCursor = options => {
    var offsetX = 0;
    var offsetY = 0;

    if (document.activeElement && document.activeElement.classList.contains('node')) {
      offsetX = {left: -64, right: parseInt(document.activeElement.offsetWidth) + 14}[options.moveAdjacent] || 0;
      offsetY = {down: 32, up: -32}[options.moveAdjacent] || 0;
      var adjacentNodes = getAllAdjacentNodesInDirection([document.activeElement], options.moveAdjacent);
      var affectedLinks = new Set();
      for (let node of adjacentNodes) {
        node.style.left = (parseInt(node.style.left) + offsetX) + 'px';
        node.style.top  = (parseInt(node.style.top)  + offsetY) + 'px';
        for (let link of node.links) affectedLinks.add(link);
      }
      for (let link of affectedLinks) layoutLink(link);
    }

    var newNode = surface.createNode({
      position: {
        x: pxToGridX(parseInt(cursor.style.left) + offsetX),
        y: pxToGridY(parseInt(cursor.style.top)  + offsetY),
      }
    });
    newNode.focus();
    var cursorPositionBefore = {
      x: parseInt(cursor.style.left),
      y: parseInt(cursor.style.top),
    }
    var cursorPositionAfter = {
      x: pxToGridX(parseInt(newNode.style.left)),
      y: pxToGridY(parseInt(newNode.style.top)),
    }
    surface.setCursorPosition(cursorPositionAfter);
    surface.deselectAll();
    var createdElements = [newNode];
    if (linkBeingCreated) {
      var createdLink = useNodeForLinkCreationMode(newNode);
      if (createdLink) {
        createdElements.push(createdLink);
      }
    }
    undo_redo.markElementsCreated(createdElements);// {cursor: {before: cursorPositionBefore, after: cursorPositionAfter}});
    return newNode;
  }

  surface.createInstanceInDirection = direction => {
    const node = surface.getNodeAtCursor();
    if (!node) {
      return;
    }

    if (surface.getAdjacentNodesInDirection(node, direction).length !== 0) {
      return;
    }

    const instance = document.createElement('input');
    instance.classList.add('node');
    instance.setAttribute('data-id', node.dataset.id);
    instance.value = node.value;
    instance.style.width = node.style.width;
    instance.setAttribute('value', node.value);
    if (direction === 'down') {
      instance.style.left = node.style.left;
      instance.style.top  = (parseInt(node.style.top) + 32) + 'px';
    } else if (direction === 'right') {
      instance.style.left = pxToGridX(parseInt(node.style.left) + parseInt(node.style.width)) + 'px';
      instance.style.top = node.style.top;
    } else if (direction === 'up') {
      instance.style.left = node.style.left;
      instance.style.top  = (parseInt(node.style.top) - 32) + 'px';
    } else if (direction === 'left') {
      instance.style.left = pxToGridX(parseInt(node.style.left) - parseInt(node.style.width)) + 'px';
      instance.style.top = node.style.top;
    }
    instance.links = new Set();
    surface.getElementsByClassName('nodes')[0].appendChild(instance);

    surface.setCursorPosition({x: parseInt(instance.style.left), y: parseInt(instance.style.top)});

    undo_redo.markElementsCreated([instance]);
  }

  surface.selectInstancesOfNodeAtCursor = (options = {}) => {
    const nodeAtCursor = surface.getNodeAtCursor();
    if (nodeAtCursor) {
      surface.deselectAll();
      const nodes = options.onlyConnectedNodes ?
        getConnectedNodes(nodeAtCursor).filter(connectedNode => connectedNode.dataset.id === nodeAtCursor.dataset.id)
        :
        surface.querySelectorAll(`.node[data-id='${nodeAtCursor.dataset.id}']`);
      for (const node of nodes) {
        node.classList.add('selected');
        if (node.overflowMap) {
          for (const nodeShadow of Object.values(node.overflowMap)) {
            nodeShadow.classList.add('selected');
          }
        }
      }
    }
  }

  surface.insertNodesAndLinksFromHtml = (html, position=null) => {
    const fragment = document.createRange().createContextualFragment(html);
    const nodes = [...fragment.querySelectorAll('.node')];
    let   links = [...fragment.querySelectorAll('.link')];
    for (let node of nodes) surface.getElementsByClassName('nodes')[0].appendChild(node);
    links = links.map(link => {
      const copiedLink = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      copiedLink.id                = link.id;
      copiedLink.className.baseVal = link.className.baseVal;
      copiedLink.dataset.from      = link.dataset.from;
      copiedLink.dataset.via       = link.dataset.via;
      copiedLink.dataset.to        = link.dataset.to;
      copiedLink.setAttribute('points', link.getAttribute('points'));
      surface.getElementsByClassName('links')[0].appendChild(copiedLink)
      return copiedLink;
    });
    deserialize(nodes, links);
    clearSerialization(nodes, links);
    if (position) {
      const leftmost = Math.min(...nodes.map(node => parseInt(node.style.left)));
      const topmost  = Math.min(...nodes.map(node => parseInt(node.style.top)));
      const deltaX = position.x - leftmost;
      const deltaY = position.y - topmost;
      for (let node of nodes) {
        node.style.left = (parseInt(node.style.left) + deltaX) + 'px';
        node.style.top  = (parseInt(node.style.top)  + deltaY) + 'px';
        node.classList.add('selected');
      }
      links.forEach(layoutLink);
    }
    surface.updateOverflowMaps(nodes);
    evaluateCursorPosition();
    return {nodes, links};
  }

  surface.updateOverflowMaps = nodes => {
    const surfaceContainer = surface.closest('.surface-container');
    if (!surfaceContainer) {
      return;
    }
    for (const overflowMap of surfaceContainer.getElementsByClassName('overflow-map')) {
      const edge = overflowMap.dataset.edge;
      // Create/update shadows for existing nodes
      for (const node of nodes) {
        node.overflowMap = node.overflowMap || {};
        let nodeShadow = node.overflowMap[edge];
        if (!nodeShadow) {
          nodeShadow = document.createElement('div');
          nodeShadow.classList.add('node-shadow');
          nodeShadow.classList.toggle('selected', node.classList.contains('selected'));
          nodeShadow.node = node;
          overflowMap.appendChild(nodeShadow);
          node.overflowMap[edge] = nodeShadow;
        }
        layoutNodeShadow(nodeShadow, node, edge);
      }
      // Remove shadows for deleted nodes
      for (const nodeShadow of [...overflowMap.getElementsByClassName('node-shadow')]) {
        if (!nodeShadow.node.parentElement) {
          nodeShadow.remove();
          delete nodeShadow.node.overflowMap[edge];
        }
      }
    }
  }

}
