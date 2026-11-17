/**
 * Combine the 27 decorative pieces of a tread into a single draw call.
 * Positions, vertex colours and local transforms are baked once on load.
 * Clones of the merged mesh still move independently and fade at belt ends.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function batchStairStep(step) {
  step.updateMatrixWorld(true);
  const pieces=[];
  let firstMaterial=null;
  step.traverse(child=>{
    if (!child.isMesh) return;
    if (!firstMaterial) firstMaterial=child.material;
    const g=child.geometry.clone();
    g.applyMatrix4(child.matrixWorld);
    // GLB uses vertex colours; ensure every part has identical attribute layout.
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (!g.getAttribute('color')) {
      const color=new Float32Array(g.getAttribute('position').count*3).fill(1);
      g.setAttribute('color',new THREE.BufferAttribute(color,3));
    }
    for(const name of Object.keys(g.attributes)) {
      if (!['position','normal','color'].includes(name)) g.deleteAttribute(name);
    }
    pieces.push(g);
  });
  if (pieces.length===0) throw new Error('Stair step GLB has no geometry');
  // Consistent key ordering is important for BufferGeometryUtils.
  for(const g of pieces) {
    const position=g.getAttribute('position'), normal=g.getAttribute('normal'), color=g.getAttribute('color');
    g.attributes={position,normal,color};
  }
  let geometry;
  try { geometry=mergeGeometries(pieces,false); }
  finally { for(const g of pieces)g.dispose(); }
  if(!geometry)throw new Error('Stair geometry merge failed');
  const material=firstMaterial?.clone() || new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true});
  material.vertexColors=true;
  material.side=THREE.FrontSide;
  const combined=new THREE.Mesh(geometry,material);
  combined.name='Batched StairMaster tread';
  combined.castShadow=true;
  combined.receiveShadow=true;
  return {mesh:combined,components:pieces.length};
}
