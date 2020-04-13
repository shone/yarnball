export function getBoundingBoxForPoints(pointA, pointB) {
  const left   = Math.min(pointA.x, pointB.x);
  const top    = Math.min(pointA.y, pointB.y);
  const right  = Math.max(pointA.x, pointB.x);
  const bottom = Math.max(pointA.y, pointB.y);
  const width  = right - left;
  const height = bottom - top;
  return {left, top, right, bottom, width, height};
}

export function makeUuid() {
  const uints = window.crypto.getRandomValues(new Uint8Array(16));
  return Array.prototype.map.call(uints, i => ('00' + i.toString(16)).slice(-2)).join('');
}
