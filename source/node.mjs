export function createNode() {
  const node = document.createElement('input');
  node.classList.add('node');
  node.setAttribute('data-id', makeUuid());
  if (options.text) node.value = text;
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

  node.getCenter = () => ({
    x: parseInt(node.style.left) + (parseInt(node.style.width) / 2) + 5,
    y: parseInt(node.style.top) + 16,
  });

  node.getBoundingBox = () => ({
    left:   parseInt(node.style.left),
    top:    parseInt(node.style.top),
    width:  parseInt(node.style.width),
    height: parseInt(node.style.height),
    right:  parseInt(node.style.left) + parseInt(node.style.width),
    bottom: parseInt(node.style.top) + parseInt(node.style.height),
  })

  node.getAnchorPoints = () => [
    {point: getNodeCenter(node)},
    {point: {x: parseInt(node.style.left) + 18, y: parseInt(node.style.top) + 16}},
    {point: {x: parseInt(node.style.left) + parseInt(node.style.width) - 8, y: parseInt(node.style.top) + 16}},
  ]

  node.getConnectedNodes = () => {
    var connectedNodes = new Set();
    var nodesToVisit = [node];
    while (nodesToVisit.length > 0) {
      var node = nodesToVisit.pop();
      connectedNodes.add(node);
      for (let link of node.links) {
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
    for (const instance of instances) {
      instance.value = name;
      instance.setAttribute('value', name);
      if (parseInt(instance.style.width) !== width) {
        instance.style.width = width + 'px';
        for (const link of node.links) layoutLink(link);
      }
    }
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
    if (edge === 'left') {
      shadow.style.zIndex = parseInt(node.style.left);
    } else if (edge === 'top') {
      shadow.style.zIndex = parseInt(node.style.top);
    } else if (edge === 'right') {
      shadow.style.zIndex = 5000 - parseInt(node.style.left);
    } else if (edge === 'bottom') {
      shadow.style.zIndex = 5000 - parseInt(node.style.top);
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
