import {makeUuid} from './utils.mjs';

export function initSurface(surface) {

  const selectionBox = surface.querySelector('.selection-box');

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

  surface.createNode = (options = {}) => {
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
    if (options.parent) {
      options.parent.appendChild(node);
    } else {
      surface.getElementsByClassName('nodes')[0].appendChild(node);
    }
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

  surface.getNodeClosestToPosition = (position, surface = currentSurface) => {
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

}
