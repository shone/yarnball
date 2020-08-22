import {
  createNode,
  initNode,
  getNodeWidthForName
} from './node.mjs';

import {
  makeUuid,
  squaredDistance,
  getBoundingBoxForPoints
} from './utils.mjs';

import {mainSurface} from './main.mjs';
import {nameMatchPanel} from './name_matching.mjs';
import * as undo_redo from './undo_redo.mjs';

export function initSurface(surface) {

  const cursor           = surface.querySelector('.cursor');
  const selectionBox     = surface.querySelector('.selection-box');
  const nodesContainer   = surface.querySelector('.nodes');
  const surfaceContainer = surface.closest('.surface-container');

  surface.cursor = cursor;
  surface.selectionBox = selectionBox;

  const pxToGridX = px => Math.round(px / 64) * 64;
  const pxToGridY = px => Math.round(px / 32) * 32;

  surface.scrollInDirection = direction => {
    switch (direction) {
      case 'left':  return surface.scrollBy(-64,   0);
      case 'right': return surface.scrollBy( 64,   0);
      case 'up':    return surface.scrollBy(  0, -32);
      case 'down':  return surface.scrollBy(  0,  32);
    }
  }

  surface.selectAll = () => {
    surface.querySelectorAll('.node').forEach(node => node.classList.add('selected'));
    if (surfaceContainer) {
      surfaceContainer.querySelectorAll('.node-shadow').forEach(shadow => shadow.classList.add('selected'));
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

  surface.selectNodes = nodes => {
    for (const node of nodes) {
      node.classList.add('selected');
      if (node.overflowMap) {
        for (const nodeShadow of Object.values(node.overflowMap)) {
          nodeShadow.classList.add('selected');
        }
      }
    }
  }

  surface.deselectNodes = nodes => {
    for (const node of nodes) {
      node.classList.remove('selected');
      if (node.overflowMap) {
        for (const nodeShadow of Object.values(node.overflowMap)) {
          nodeShadow.classList.remove('selected');
        }
      }
    }
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
    const intersectingNodes = new Set(surface.getNodesIntersectingBox(position));
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
      if ((position.y === node.y) &&
        (position.x >= node.x) && (position.x < (node.x + parseInt(node.style.width)))) {
        return node;
      }
    }
    return null;
  }

  surface.getClosestNodeTo = (position, nodes = surface.getElementsByClassName('node')) => {
    let closestNode = null;
    let closestNodeDistance = null;
    for (let node of nodes) {
      const distance = squaredDistance(position, node.getPos());
      if (!closestNode || distance < closestNodeDistance) {
        closestNode = node;
        closestNodeDistance = distance;
      }
    }
    return closestNode;
  }

  surface.getNodesIntersectingBox = (box, nodes = [...surface.getElementsByClassName('node')]) => {
    return nodes.filter(node => {
      return !(
        ((node.x + getNodeWidthForName(node.value)) <  box.left)  ||
        (node.x                                     >= box.right) ||
        ((node.y  + 20)                             <  box.top)   ||
        (node.y                                     >= box.bottom)
      );
    });
  }

  surface.getNodeClosestToPosition = (position) => {
    let closestNode = null;
    let closestDistance = null;
    for (let node of surface.getElementsByClassName('node')) {
      var deltaX = node.x - position.x;
      var deltaY = node.y - position.y;
      var distance = (deltaX*deltaX) + (deltaY*deltaY);
      if (!closestNode || (distance < closestDistance)) {
        closestNode = node;
        closestDistance = distance;
      }
    }
    return closestNode;
  }

  surface.getAdjacentNodesInDirection = (sourceNode, direction) => {
    return [...surface.getElementsByClassName('node')].filter(node => {
      if (node === sourceNode) return false;
      return (
        (direction === 'right' &&
        node.y === sourceNode.y &&
        node.x === sourceNode.x + parseInt(sourceNode.style.width) + 14)
        ||
        (direction === 'left' &&
          node.y === sourceNode.y &&
          node.x + parseInt(node.style.width) === sourceNode.x - 14)
        ||
        (direction === 'up' &&
          node.y === sourceNode.y - 32 &&
          !(node.x > sourceNode.x + parseInt(sourceNode.style.width) ||
            node.x + parseInt(node.style.width) < sourceNode.x))
        ||
        (direction === 'down' &&
          node.y === sourceNode.y + 32 &&
          !(node.x > sourceNode.x + parseInt(sourceNode.style.width) ||
            node.x + parseInt(node.style.width) < sourceNode.x))
      );
    });
  }

  surface.getAllAdjacentNodesInDirection = (sourceNodes, direction) => {
    var adjacentNodes = [];
    var currentSet = [...sourceNodes];
    do {
      var newSet = new Set();
      for (let node of currentSet) {
        surface.getAdjacentNodesInDirection(node, direction).forEach(n => newSet.add(n));
      }
      newSet.forEach(n => adjacentNodes.push(n));
      currentSet = [...newSet];
    } while(currentSet.length !== 0)
    return adjacentNodes;
  }

  function getNodesOrganizedIntoRows(nodes) {
    var rows = [];
    for (const node of nodes) {
      var row = node.y / 32;
      rows[row] = rows[row] || [];
      rows[row].push(node);
    }
    return rows;
  }

  function getNodesOrganizedIntoColumns(nodes) {
    var columns = [];
    for (const node of nodes) {
      var nodeWidth = parseInt(node.style.width);
      var column = node.x / 64;
      var columnCount = pxToGridX(nodeWidth) / 64;
      for (let c=0; c < columnCount; c++) {
        columns[column+c] = columns[column+c] || [];
        columns[column+c].push(node);
      }
    }
    return columns;
  }

  function getGroupsOrganizedIntoRows(groups) {
    const rows = [];
    for (const group of groups) {
      for (const node of group) {
        const row = node.y / 32;
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
        const nodeWidth = parseInt(node.style.width);
        const column = node.x / 64;
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
          row.sort((a,b) => a.x - b.x);
        } else if (direction === 'right') {
          row.sort((a,b) => b.x - a.x);
        }
        let lastNodeEdge = null;
        let lastNodeWasSourceNode = null;
        let currentBlock = [];
        for (const node of row) {
          var leftEdge = node.x;
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
          column.sort((a,b) => b.y - a.y);
        } else if (direction === 'down') {
          column.sort((a,b) => a.y - b.y);
        }
      }
      const maxY = Math.max(...columns.filter(column => column).map(column => ((direction === 'down' ? column[column.length-1] : column[0]).y)));
      const rowCount = (maxY + 32) / 32;
      for (let row = 0; row < rowCount; row++) {
        const normalizedRow = direction === 'down' ? row : (rowCount - row);
        const rowY = normalizedRow * 32;
        for (const column of columns) {
          if (!column) {
            continue;
          }
          const nodeIndex = column.findIndex(node => node.y === rowY);
          if (nodeIndex >= 1) {
            const node     = column[nodeIndex];
            const prevNode = column[nodeIndex-1];
            if (Math.abs(prevNode.y - node.y) === 32) {
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
          row.sort((a,b) => a.node.x - b.node.x);
        } else if (direction === 'right') {
          row.sort((a,b) => b.node.x - a.node.x);
        }
        let lastNodeEdge = null;
        let lastNodeGroup = null;
        for (const entry of row) {
          const leftEdge = entry.node.x;
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
          column.sort((a,b) => a.node.y - b.node.y);
        } else if (direction === 'down') {
          column.sort((a,b) => b.node.y - a.node.y);
        }
        let lastNodeEdge = null;
        let lastNodeGroup = null;
        for (const entry of column) {
          const topEdge = entry.node.y;
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

  surface.layoutLinks = links => {
    for (const link of links) {
      surface.layoutLink(link);
    }
  }

  surface.layoutLink = (link, lastPosition) => {
    const points = [];
    if (link.from) {
      const nextPoint = link.via ? link.via.getCenter() : lastPosition;
      const anchorPoints = link.from.getAnchorPoints();
      for (let anchor of anchorPoints) {
        anchor.distance = squaredDistance(nextPoint, anchor.point);
      }
      anchorPoints.sort((a, b) => a.distance - b.distance);
      points.push(anchorPoints[0].point);
    }
    if (link.via) {
      points.push(link.via.getCenter());
    }
    if (link.to) {
      const viaPoint = link.via.getCenter();
      const anchorPoints = link.to.getAnchorPoints();
      for (let anchor of anchorPoints) {
        anchor.distance = squaredDistance(viaPoint, anchor.point);
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

  surface.getConnectedLinks = link => {
    var nodesAlreadySeen = new Set([link.from, link.via, link.to]);
    var linksAlreadySeen = new Set([link]);
    var allLinks = [...surface.getElementsByClassName('link')].filter(link => link.from && link.via && link.to);
    var connectedLinks = [];
    var connectedLink = null;
    do {
      connectedLink = allLinks.find(link => {
        if (linksAlreadySeen.has(link)) return false;
        return nodesAlreadySeen.has(link.from) ||
              nodesAlreadySeen.has(link.via) ||
              nodesAlreadySeen.has(link.to);
      });
      if (connectedLink) {
        connectedLinks.push(connectedLink);
        linksAlreadySeen.add(connectedLink);
        nodesAlreadySeen.add(connectedLink.from);
        nodesAlreadySeen.add(connectedLink.via);
        nodesAlreadySeen.add(connectedLink.to);
      }
    } while(connectedLink);
    return connectedLinks;
  }

  surface.getAllConnectedNodesAndLinks = (node, connectedNodes, connectedLinks) => {
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

  let linkBeingCreated = null;
  surface.linkBeingCreated = linkBeingCreated;
  surface.useNodeForLinkCreationMode = node => {
    if (linkBeingCreated) {
      if (!linkBeingCreated.from) {
        linkBeingCreated.from = node;
      } else if (!linkBeingCreated.via) {
        if (linkBeingCreated.from === node) return;
        linkBeingCreated.via = node;
        surface.layoutLink(linkBeingCreated, {x: parseInt(cursor.style.left) + 32, y: parseInt(cursor.style.top) + 32});
      } else if (!linkBeingCreated.to) {
        if (linkBeingCreated.from === node || linkBeingCreated.via === node) return;
        const existingLink = [...surface.getElementsByClassName('link')].find(link => {
          return link.from === linkBeingCreated.from &&
                link.via  === linkBeingCreated.via  &&
                link.to   === node;
        });
        if (existingLink) {
          surface.deleteElements([existingLink]);
          linkBeingCreated.remove();
          undo_redo.markElementsDeleted([existingLink]);
        } else {
          linkBeingCreated.to = node;
          linkBeingCreated.from.links.add(linkBeingCreated);
          linkBeingCreated.via.links.add(linkBeingCreated);
          linkBeingCreated.to.links.add(linkBeingCreated);
          linkBeingCreated.classList.add('link');
          linkBeingCreated.classList.remove('unfinished-link');
          surface.layoutLink(linkBeingCreated);
        }
        const createdLink = linkBeingCreated;
        linkBeingCreated = null;
        cursor.classList.remove('insert-mode');
        surface.resetCursorBlink();
        return createdLink;
      }
    }
    return null;
  }
  surface.executeLinkMode = () => {
    if (!linkBeingCreated) {
      linkBeingCreated = surface.createLink();
      let nodeAtCursor = surface.getNodeAtCursor();
      if (nodeAtCursor) {
        surface.useNodeForLinkCreationMode(nodeAtCursor);
      }
      cursor.classList.add('insert-mode');
      surface.resetCursorBlink();
      nameMatchPanel.remove();
    } else {
      let nodeAtCursor = surface.getNodeAtCursor();
      if (nodeAtCursor) {
        var createdLink = surface.useNodeForLinkCreationMode(nodeAtCursor);
        if (createdLink) {
          undo_redo.markElementsCreated([createdLink]);
        }
      } else {
        surface.cancelLinkMode();
      }
    }
  }
  surface.isLinkModeActive = () => linkBeingCreated !== null;
  surface.cancelLinkMode = () => {
    if (linkBeingCreated) {
      linkBeingCreated.remove();
      linkBeingCreated = null;
      cursor.classList.remove('insert-mode');
      surface.resetCursorBlink();
    }
  }

  surface.getCursorPosition = () => {
    return {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
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

    const nodeUnderCursor = surface.getNodeAtCursor();

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
      surface.setSelectionBox(getBoundingBoxForPoints(selectionBox.anchorPosition, {x: cursorX, y: cursorY}));
      selectionBox.classList.remove('hidden');
    } else {
      surface.deselectAll();
    }
    surface.setCursorPosition({x: cursorX, y: cursorY});
    const nodeUnderCursor = surface.getNodeAtCursor();
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

  surface.moveCursorToNode = node => {
    surface.setCursorPosition({x: node.x, y: node.y});
  }
  surface.getNodeAtCursor = () => {
    const cursor_ = surface.getElementsByClassName('cursor')[0];
    return surface.getNodeAtPosition({x: parseInt(cursor_.style.left), y: parseInt(cursor_.style.top)});
  }
  surface.moveCursorToBlockEdge = (direction, options) => {
    options = options || {};
    var cursorPosition = {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
    var nodesInRow = [...surface.getElementsByClassName('node')].filter(node => node.style.top === cursor.style.top);
    if (options.dragSelectionBox && selectionBox.classList.contains('hidden')) {
      selectionBox.anchorPosition = cursorPosition;
    }
    if (direction === 'left') {
      var nodesToLeft = nodesInRow.filter(node => node.x < cursorPosition.x);
      if (nodesToLeft.length > 0) {
        nodesToLeft.sort((a, b) => a.x - b.x);
        var node = nodesToLeft[nodesToLeft.length - 1];
        if ((cursorPosition.x - (node.x + parseInt(node.style.width))) > 20) {
          surface.moveCursorToNode(node);
        } else {
          for (var i = nodesToLeft.length - 2; i >= 0; i--) {
            if ((node.x - (nodesToLeft[i].x + parseInt(nodesToLeft[i].style.width))) > 20) {
              break;
            }
            node = nodesToLeft[i];
          }
          surface.moveCursorToNode(node);
        }
      } else {
        surface.setCursorPosition({x: 0, y: cursorPosition.y});
      }
    } else if (direction === 'right') {
      var nodesToRight = nodesInRow.filter(node => node.x > cursorPosition.x);
      if (nodesToRight.length === 0) {
        return;
      }
      nodesToRight.sort((a, b) => a.x - b.x);
      var node = nodesToRight[0];
      var nodeAtCursor = getNodeAtCursor();
      if (!nodeAtCursor || (node.x - (nodeAtCursor.x + parseInt(nodeAtCursor.style.width)) > 20)) {
        surface.moveCursorToNode(node);
      } else {
        for (var i=1; i < nodesToRight.length; i++) {
          if ((nodesToRight[i].x - (node.x + parseInt(node.style.width))) > 20) {
            break;
          }
          node = nodesToRight[i];
        }
        surface.moveCursorToNode(node);
      }
    }
    if (options.dragSelectionBox) {
      cursorPosition = {x: parseInt(cursor.style.left), y: parseInt(cursor.style.top)};
      setSelectionBox(getBoundingBoxForPoints(selectionBox.anchorPosition, cursorPosition));
      selectionBox.classList.remove('hidden');
    } else {
      surface.deselectAll();
    }
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
    const html = surface.getNodesAndLinksAsHtml(selectedNodes, affectedLinks);
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
        surface.deleteElements(elements);
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
      return node.x + moveDelta.x < 0 ||
             node.y + moveDelta.y < 0;
    });
    if (willNodeBeMovedOutOfBounds) return false;

    const oldPositions = [...nodesToMove].map(node => ({node: node, pos: node.getPos()}));

    for (const node of nodesToMove) {
      node.setPos(
        node.x + moveDelta.x,
        node.y + moveDelta.y
      )
      node.links.forEach(link => affectedLinks.add(link));
    }
    surface.layoutLinks(affectedLinks);

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

//     const selectionBoxBefore = surface.getSelectionBox();
    selectionBox.style.left = (parseInt(selectionBox.style.left) + moveDelta.x) + 'px';
    selectionBox.style.top  = (parseInt(selectionBox.style.top)  + moveDelta.y) + 'px';
//     const selectionBoxAfter = surface.getSelectionBox();

    const newPositions = [...nodesToMove].map(node => ({node: node, pos: node.getPos()}));

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
      var adjacentNodes = surface.getAllAdjacentNodesInDirection([document.activeElement], options.moveAdjacent);
      var affectedLinks = new Set();
      for (let node of adjacentNodes) {
        node.setPos(
          node.x + offsetX,
          node.y + offsetY
        )
        for (let link of node.links) affectedLinks.add(link);
      }
      surface.layoutLinks(affectedLinks);
    }

    var newNode = surface.createNode({
      position: {
        x: pxToGridX(parseInt(cursor.style.left) + offsetX),
        y: pxToGridY(parseInt(cursor.style.top)  + offsetY),
      }
    });
    newNode.focus();
//     var cursorPositionBefore = {
//       x: parseInt(cursor.style.left),
//       y: parseInt(cursor.style.top),
//     }
    var cursorPositionAfter = {
      x: pxToGridX(newNode.x),
      y: pxToGridY(newNode.y),
    }
    surface.setCursorPosition(cursorPositionAfter);
    surface.deselectAll();
    var createdElements = [newNode];
    if (linkBeingCreated) {
      var createdLink = surface.useNodeForLinkCreationMode(newNode);
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
    instance.links = new Set();
    initNode(instance);
    switch (direction) {
      case 'down':
        instance.setPos(node.x, node.y + 32);
        break;
      case 'right':
        instance.setPos(pxToGridX(node.x + parseInt(node.style.width)), node.y);
        break;
      case 'up':
        instance.setPos(node.x, node.y - 32);
        break;
      case 'left':
        instance.setPos(pxToGridX(node.x - parseInt(node.style.width)), node.y);
        break;
    }

    nodesContainer.appendChild(instance);

    surface.setCursorPosition(instance.getPos());

    undo_redo.markElementsCreated([instance]);
  }

  surface.selectInstancesOfNodeAtCursor = (options = {}) => {
    const nodeAtCursor = surface.getNodeAtCursor();
    if (nodeAtCursor) {
      surface.deselectAll();
      const nodes = options.onlyConnectedNodes ?
        nodeAtCursor.getConnectedNodes().filter(connectedNode => connectedNode.dataset.id === nodeAtCursor.dataset.id)
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

  // Setup overflow maps
  if (surfaceContainer) {
    for (const overflowMap of surfaceContainer.getElementsByClassName('overflow-map')) {
      surface.addEventListener('scroll', event => {
        overflowMap.scrollTo(surface.scrollLeft, surface.scrollTop);
      });
      overflowMap.addEventListener('mousedown', event => {
        if (!event.target.classList.contains('node-shadow')) return;
        switch (overflowMap.dataset.edge) {
          case 'left':
            surface.scrollTo({left: event.target.node.x, behavior: 'smooth'});
            break;
          case 'top':
            surface.scrollTo({top: event.target.node.y, behavior: 'smooth'});
            break;
          case 'right':
            const nodeRight = event.target.node.x + parseInt(event.target.node.style.width) + 14;
            surface.scrollTo({left: nodeRight - (surfaceContainer.offsetWidth - 40), behavior: 'smooth'});
            break;
          case 'bottom':
            const nodeBottom = event.target.node.y + 32;
            surface.scrollTo({top: nodeBottom - (surfaceContainer.offsetHeight - 40), behavior: 'smooth'});
            break;
        }
      });
    }
  }

  surface.updateOverflowMaps = nodes => {
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
        node.layoutShadow(nodeShadow, edge);
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

  surface.deleteElements = elements => {
    const affectedLinks = new Set();
    for (const element of elements) {
      if (element.classList.contains('node')) {
        for (const link of element.links) affectedLinks.add(link);
        if (linkBeingCreated) {
          if (linkBeingCreated.from === element || linkBeingCreated.via === element) {
            cancelLinkMode();
          }
        }
        element.remove();
      } else if (element.classList.contains('link')) {
        affectedLinks.add(element);
      }
    }
    for (const link of affectedLinks) {
      link.from.links.delete(link);
      link.via.links.delete(link);
      link.to.links.delete(link);
      link.remove();
    }
    surface.evaluateCursorPosition();
    return affectedLinks;
  }

  surface.deleteSelection = () => {
    const elementsToDelete = new Set(surface.getElementsByClassName('selected'));
    let nodeAtCursor = surface.getNodeAtCursor();
    if (nodeAtCursor) {
      elementsToDelete.add(nodeAtCursor);
    }
    if (elementsToDelete.size === 0) return false;
    var affectedLinks = surface.deleteElements(elementsToDelete);
  //   recordAction(
      undo_redo.markElementsDeleted(new Set([...elementsToDelete, ...affectedLinks]));
  //     {
  //       selectionBox: {before: getSelectionBox(), after: null},
  //     }
  //   );
    selectionBox.classList.add('hidden');
  }

  surface.backspace = () => {
    if (surface.getElementsByClassName('selected').length > 0) {
      deleteSelection();
    } else if (document.activeElement && document.activeElement.classList.contains('node')) {
      var node = document.activeElement;
      if (node.value !== '') {
        node.setName(node.value.slice(0, -1));
      } else {
        var affectedLinks = surface.deleteElements([node]);
        var oldCursorPosition = surface.getCursorPosition();
        var newCursorPosition = {x: Math.max(0, oldCursorPosition.x - 64), y: oldCursorPosition.y};
        surface.setCursorPosition(newCursorPosition);
  //       recordAction(
          undo_redo.markElementsDeleted([node, ...affectedLinks]);
  //         {cursor: {before: oldCursorPosition, after: newCursorPosition}}
  //       );
      }
    } else {
      surface.setCursorPosition({x: Math.max(0, parseInt(cursor.style.left) - 64), y: parseInt(cursor.style.top)});
    }
  }

  surface.deserialize = (nodes, links) => {
    for (let link of links) {
      link.from = document.getElementById(link.dataset.from);
      link.via  = document.getElementById(link.dataset.via);
      link.to   = document.getElementById(link.dataset.to);
    }
    for (let node of nodes) {
      if (node.dataset.links) {
        node.links = new Set(node.dataset.links.split(',').map(id => document.getElementById(id)));
      } else {
        node.links = new Set();
      }
    }
  }

  surface.clearSerialization = (nodes, links) => {
    for (let link of links) {
      link.removeAttribute('id');
      link.removeAttribute('data-from');
      link.removeAttribute('data-via');
      link.removeAttribute('data-to');
    }
    for (let node of nodes) {
      node.removeAttribute('id');
      node.removeAttribute('data-links');
      node.removeAttribute('data-instances')
    }
  }

  surface.clear = () => {
    surface.querySelector('.nodes').innerHTML = '';
    surface.querySelector('.links').innerHTML = '';
    surface.updateOverflowMaps([]);
    surface.evaluateCursorPosition();
  }

  surface.insertNodesAndLinksFromHtml = (html, position=null) => {
    const fragment = document.createRange().createContextualFragment(html);
    const nodes = [...fragment.querySelectorAll('.node')];
    let   links = [...fragment.querySelectorAll('.link')];
    nodes.forEach(initNode);
    nodesContainer.append(...nodes);
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
    surface.deserialize(nodes, links);
    surface.clearSerialization(nodes, links);
    if (position) {
      const leftmost = Math.min(...nodes.map(node => node.x));
      const topmost  = Math.min(...nodes.map(node => node.y));
      const deltaX = position.x - leftmost;
      const deltaY = position.y - topmost;
      for (let node of nodes) {
        node.setPos(
          node.x + deltaX,
          node.y + deltaY
        )
        node.classList.add('selected');
      }
      surface.layoutLinks(links);
    }
    surface.updateOverflowMaps(nodes);
    surface.evaluateCursorPosition();
    return {nodes, links};
  }

  surface.getNodesAndLinksAsHtml = (nodes=[...surface.getElementsByClassName('node')], links=[...surface.getElementsByClassName('link')]) => {
    const classes = new Map();
    for (let node of nodes) {
      classes.set(node, node.className);
      node.className = 'node';
    }
    for (let link of links) {
      classes.set(link, link.className.baseVal);
      link.className.baseVal = 'link';
    }

    // Assign IDs to nodes and links
    let id = 0;
    for (let node of nodes) {
      node.id = id++;
    }
    for (let link of links) {
      link.id = id++;
      link.dataset.from = link.from.id;
      link.dataset.via  = link.via.id;
      link.dataset.to   = link.to.id;
    }

    const linksSet = new Set(links);
    for (let node of nodes) {
      if (node.links.size > 0) {
        node.dataset.links = [...node.links].filter(link => linksSet.has(link)).map(link => link.id).join(',');
      }
    }

    const html = '<div class="nodes">' + [...nodes].map(node => node.outerHTML).join('') + '</div>' +
                '<svg class="links">' + [...links].map(link => link.outerHTML).join('') + '</svg>';

    surface.clearSerialization(nodes, links);

    for (let [element, className] of classes) {
      if (element.classList.contains('link')) {
        element.className.baseVal = className;
      } else {
        element.className = className;
      }
    }

    return html;
  }

  surface.getAsYarnballFile = () => {
    let file = '';

    const nodeNames = new Map();
    for (const node of [...surface.getElementsByClassName('node')]) {
      nodeNames.set(node.dataset.id, node.value);
    }

    file += '[node_names]\n';
    for (const [id, name] of nodeNames) {
      file += `${id} ${name}\n`;
    }

    file += '[node_layout]\n';
    let index = 0;
    let instanceIndex = 0;
    const instanceIndexes = new Map();
    for (const id of nodeNames.keys()) {
      const instances = [...surface.querySelectorAll(`.node[data-id="${id}"]`)];
      for (const instance of instances) {
        file += `${index} ${instance.x},${instance.y}\n`;
        instanceIndexes.set(instance, instanceIndex);
        instanceIndex++;
      }
      index++;
    }

    file += '[link_layout]\n';
    for (const link of [...surface.getElementsByClassName('link')]) {
      file += `${instanceIndexes.get(link.from)} ${instanceIndexes.get(link.via)} ${instanceIndexes.get(link.to)}\n`;
    }

    file += '[graph]\n';
    const uniqueLinks = new Set([...surface.getElementsByClassName('link')].map(link => `${link.from.dataset.id} ${link.via.dataset.id} ${link.to.dataset.id}`));
    file += [...uniqueLinks].map(link => link + '\n');

    return file;
  }

  surface.lastFocusedNodeOriginalName = null;
  if (surface.getNodeAtCursor() !== null) {
    surface.lastFocusedNodeOriginalName = getNodeAtCursor().value;
  }

  document.addEventListener('focusin', event => {
    if (event.target.classList.contains('node')) {
      surface.lastFocusedNodeOriginalName = event.target.value;
    }
  });

  document.addEventListener('focusout', event => {
    if (event.target.classList.contains('node')) {
      if (event.target.value !== surface.lastFocusedNodeOriginalName) {
        undo_redo.markNodeRenamed(event.target, surface.lastFocusedNodeOriginalName);
      }
    }
  });

}
