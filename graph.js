'use strict';

const graph = {

  getNameForId(id) {
    var node = mainSurface.querySelector(`.node[data-id='${id}']`);
    return node ? node.value : '';
  },

  findLinkVia(node, via) {
    for (var instance of mainSurface.querySelectorAll(`.node[data-id='${via}']`)) {
      var link = [...instance.links].find(link => link.from.getAttribute('data-id') === node && link.via.getAttribute('data-id') === via);
      if (link) return link;
    }
    return null;
  },

  findLinksVia(node, via) {
    return [...mainSurface.getElementsByClassName('link')].filter(link => link.from.getAttribute('data-id') === node && link.via.getAttribute('data-id') === via);
  },

  findNodeVia(node, via) {
    var link = this.findLinkVia(node, via);
    return link ? link.to.getAttribute('data-id') : null;
  },

  findNodesVia(node, via) {
    var links = this.findLinksVia(node, via);
    return [...new Set(links.map(link => link.to.getAttribute('data-id')))];
  },

  followListNodes(id, forward) {
    var ids = [];
    var alreadyVisited = new Set();
    do {
      if (alreadyVisited.has(id)) break;
      ids.push(id);
      alreadyVisited.add(id);
      id = this.findNodeVia(id, forward) || null;
    } while(id)
    return ids;
  },

}
