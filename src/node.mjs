import {makeUuid} from './utils.mjs';

import {highlightQueriedNodes} from './main.mjs';

export function createNode(options) {
  const node = document.createElement('input');
  node.classList.add('node');
  node.setAttribute('data-id', makeUuid());
  if (options.text) node.value = options.text;
  if (options.position) {
    node.style.left = String(options.position.x) + 'px';
    node.style.top  = String(options.position.y) + 'px';
  } else {
    node.style.left = '0px';
    node.style.top  = '0px';
  }
  node.style.width = '50px';
  node.links = new Set();
  initNode(node);
  return node;
}

export function initNode(node) {

  node.x = parseInt(node.style.left);
  node.y = parseInt(node.style.top);

  node.setX = x => { node.x = x; node.style.left = x + 'px'; }
  node.setY = y => { node.y = y; node.style.top  = y + 'px'; }
  node.setPos = (x, y) => {
    node.x = x;
    node.y = y;
    node.style.left = x + 'px';
    node.style.top = y + 'px';
  }
  node.getPos = () => ({x: node.x, y: node.y});

  node.getCenter = () => ({
    x: node.x + (parseInt(node.style.width) / 2) + 5,
    y: node.y + 16,
  });

  node.getBoundingBox = () => ({
    left:   node.x,
    top:    node.y,
    width:  parseInt(node.style.width),
    height: parseInt(node.style.height),
    right:  node.x + parseInt(node.style.width),
    bottom: node.y + parseInt(node.style.height),
  })

  node.getAnchorPoints = () => [
    {point: node.getCenter()},
    {point: {x: node.x + 18, y: node.y + 16}},
    {point: {x: node.x + parseInt(node.style.width) - 8, y: node.y + 16}},
  ]

  node.getConnectedNodes = () => {
    var connectedNodes = new Set();
    var nodesToVisit = [node];
    while (nodesToVisit.length > 0) {
      const visitingNode = nodesToVisit.pop();
      connectedNodes.add(visitingNode);
      for (let link of visitingNode.links) {
        if (!connectedNodes.has(link.from)) nodesToVisit.push(link.from);
        if (!connectedNodes.has(link.via))  nodesToVisit.push(link.via);
        if (!connectedNodes.has(link.to))   nodesToVisit.push(link.to);
      }
    }
    return [...connectedNodes];
  }

  node.setName = name => {
    const instances = [...document.querySelectorAll(`[data-id="${node.dataset.id}"]`)];
    const width = getNodeWidthForName(name);
    const affectedLinks = new Set();
    const surface = node.closest('.surface');
    for (const instance of instances) {
      instance.value = name;
      instance.setAttribute('value', name);
      if (parseInt(instance.style.width) !== width) {
        instance.style.width = width + 'px';
        node.links.forEach(link => affectedLinks.add(link))
      }
    }
    surface.layoutLinks(affectedLinks);
    if (node.closest('[data-panel="find"]')) {
      highlightQueriedNodes();
    }
  }

  node.layoutShadow = (shadow, edge) => {
    // Position
    shadow.style.left = node.style.left;
    shadow.style.top  = node.style.top;

    // Dimensions
    if (edge === 'top' || edge === 'bottom') {
      shadow.style.width = node.style.width;
    }
    if (edge === 'right') {
      shadow.style.width = (parseInt(node.style.width) + 5000) + 'px';
    } else if (edge === 'bottom') {
      shadow.style.height = (20 + 5000) + 'px';
    }

    // Z-index
    switch (edge) {
      case   'left': shadow.style.zIndex = node.x; break;
      case    'top': shadow.style.zIndex = node.y; break;
      case  'right': shadow.style.zIndex = 5000 - node.x; break;
      case 'bottom': shadow.style.zIndex = 5000 - node.y; break;
    }
  }
}

export function getNodeWidthForName(name) {
  const characterWidth = 6.02;
  const padding = 5;
  const stringWidth = padding + (name.length * characterWidth);
  if (stringWidth <= 50) {
    return 50;
  } else if (stringWidth <= 114) {
    return 114;
  } else {
    return 114 + (Math.ceil((stringWidth - 114) / 64) * 64);
  }
}
