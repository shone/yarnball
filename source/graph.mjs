export function getNameForId(id) {
  const node = mainSurface.querySelector(`.node[data-id='${id}']`);
  return node ? node.value : '';
}

export function findLinkVia(node, via) {
  for (const instance of [...mainSurface.querySelectorAll(`.node[data-id='${via}']`)]) {
    const link = [...instance.links].find(link => link.from.dataset.id === node && link.via.dataset.id === via);
    if (link) return link;
  }
  return null;
}

export function findLinksVia(node, via) {
  return [...mainSurface.getElementsByClassName('link')].filter(link => link.from.dataset.id === node && link.via.dataset.id === via);
}

export function findNodeVia(node, via) {
  const link = this.findLinkVia(node, via);
  return link ? link.to.dataset.id : null;
}

export findNodesVia(node, via) {
  const links = this.findLinksVia(node, via);
  return [...new Set(links.map(link => link.to.dataset.id))];
}

export function followListNodes(id, forward) {
  const ids = [];
  const alreadyVisited = new Set();
  do {
    if (alreadyVisited.has(id)) break;
    ids.push(id);
    alreadyVisited.add(id);
    id = this.findNodeVia(id, forward) || null;
  } while(id)
  return ids;
}
