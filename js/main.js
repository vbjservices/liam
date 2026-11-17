
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { AdaptiveQuality } from './quality.js';
import { FrameDiagnostics } from './diagnostics.js';
import { createRenderScheduler } from './scheduler.js';
import { batchStairStep } from './step-batching.js';
import { createCameraSampler } from './camera-path.js';
const canvas=document.querySelector('#three');
let firstFrameDrawn=false;
let firstUsableFramePending=false;
let essentialAssetsSettled=false;
const loadingElement=document.getElementById('loader');
const fallbackElement=document.getElementById('fallback');
if (fallbackElement) fallbackElement.style.visibility='hidden';
function dismissLoader(){
  if(!loadingElement || loadingElement.classList.contains('hide'))return;
  loadingElement.classList.add('hide');
  window.setTimeout(()=>loadingElement.remove(),850);
}
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const quality=new AdaptiveQuality(renderer);
const diagnostics=new FrameDiagnostics(renderer);
const scene=new THREE.Scene();scene.background=new THREE.Color('#0b171b');scene.fog=new THREE.FogExp2('#101d22',.013);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.06,350);
scene.add(new THREE.HemisphereLight(0xcce8ff,0x122024,2.1));const key=new THREE.DirectionalLight(0xf4f5e5,3.1);key.position.set(-14,27,22);scene.add(key);const rim=new THREE.DirectionalLight(0x8fd4e1,3);rim.position.set(9,12,-15);scene.add(rim);
const M={frame:new THREE.MeshStandardMaterial({color:0x151f24,metalness:.85,roughness:.31}),dark:new THREE.MeshStandardMaterial({color:0x080e13,metalness:.58,roughness:.37}),metal:new THREE.MeshStandardMaterial({color:0x34464c,metalness:.75,roughness:.29}),rubber:new THREE.MeshStandardMaterial({color:0x11191c,metalness:.15,roughness:.86}),lime:new THREE.MeshStandardMaterial({color:0xdffb78,emissive:0x566c22,emissiveIntensity:.35,roughness:.35}),screen:new THREE.MeshStandardMaterial({color:0x0c2a34,emissive:0x146378,emissiveIntensity:.6}),snow:new THREE.MeshStandardMaterial({color:0xe5f3fa,roughness:.9,flatShading:true}),ice:new THREE.MeshStandardMaterial({color:0x9cbfd2,roughness:.85,flatShading:true}),rock:new THREE.MeshStandardMaterial({color:0x344b58,roughness:1,flatShading:true}),stone:new THREE.MeshStandardMaterial({color:0x526d79,roughness:1,flatShading:true})};
// Dedicated reusable GLB assets. The 3D StairMaster lives in assets/models/.
const gym=new THREE.Group();scene.add(gym);
// V4.2: procedural studio reflection environment just for the typography.
// Long softbox strips make the actual beveled face respond to reflection, rather
// than relying entirely on a painted gradient. No external HDRI required.
const studioCanvas=document.createElement('canvas');studioCanvas.width=1024;studioCanvas.height=512;
const sc=studioCanvas.getContext('2d');
const g= sc.createLinearGradient(0,0,0,512);
g.addColorStop(0,'#657984');g.addColorStop(.28,'#17262e');g.addColorStop(.55,'#0b151c');g.addColorStop(1,'#293842');
sc.fillStyle=g;sc.fillRect(0,0,1024,512);
function softbox(x,y,w,h,brightness){
 const grd=sc.createLinearGradient(x,0,x+w,0);
 grd.addColorStop(0,'rgba(255,255,255,0)');grd.addColorStop(.24,`rgba(255,255,255,${brightness})`);
 grd.addColorStop(.76,`rgba(255,255,255,${brightness})`);grd.addColorStop(1,'rgba(255,255,255,0)');
 sc.fillStyle=grd;sc.fillRect(x,y,w,h);
}
softbox(120,65,130,335,.86);softbox(440,55,100,370,.67);softbox(740,90,145,300,.94);
const studioTexture=new THREE.CanvasTexture(studioCanvas);studioTexture.mapping=THREE.EquirectangularReflectionMapping;
studioTexture.colorSpace=THREE.SRGBColorSpace;
const pmrem=new THREE.PMREMGenerator(renderer);
const studioReflection=pmrem.fromEquirectangular(studioTexture).texture;
pmrem.dispose();studioTexture.dispose();

function makeRefinedCylinderMaterial(kind='metal'){
 if(kind==='grip') return new THREE.MeshPhysicalMaterial({color:0x1e2a2f,metalness:.18,roughness:.56,clearcoat:.12,clearcoatRoughness:.35,envMap:studioReflection,envMapIntensity:.75});
 if(kind==='roller') return new THREE.MeshPhysicalMaterial({color:0x8fa2ab,metalness:.92,roughness:.22,clearcoat:.34,clearcoatRoughness:.18,envMap:studioReflection,envMapIntensity:1.2});
 if(kind==='bolt') return new THREE.MeshPhysicalMaterial({color:0xc8d5db,metalness:.96,roughness:.18,clearcoat:.48,clearcoatRoughness:.14,envMap:studioReflection,envMapIntensity:1.32});
 return new THREE.MeshPhysicalMaterial({color:0xb9c8cf,metalness:.95,roughness:.2,clearcoat:.52,clearcoatRoughness:.16,envMap:studioReflection,envMapIntensity:1.28});
}
function refineStairmasterCylinders(root){
 root.traverse(o=>{
  if(!o.isMesh) return;
  const n=(o.name||'').toLowerCase();
  if(!/(handrail|handle|support|roller|rail_bolt|frame_front|frame_upper)/.test(n)) return;
  if(o.geometry && o.geometry.computeVertexNormals) o.geometry.computeVertexNormals();
  let kind='metal';
  if(/inner_handle|cross/.test(n)) kind='grip';
  else if(/roller/.test(n)) kind='roller';
  else if(/bolt/.test(n)) kind='bolt';
  const replacement=makeRefinedCylinderMaterial(kind);
  replacement.flatShading=false;
  replacement.side=THREE.FrontSide;
  replacement.needsUpdate=true;
  if(Array.isArray(o.material)) o.material=o.material.map(()=>replacement.clone());
  else o.material=replacement;
  o.castShadow=true; o.receiveShadow=true;
 });
}

function box(parent,w,h,d,x,y,z,mat){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m}
function tube(parent,a,b,r,mat){let dir=new THREE.Vector3().subVectors(b,a);let m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),24),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());parent.add(m);return m}
function P(x,y,z){return new THREE.Vector3(x,y,z)}
const treads=[], modelGroup=new THREE.Group();gym.add(modelGroup);
const modelLoader=new GLTFLoader();
const fontLoader=new FontLoader();
// Rollback to proven V4.3 3D typography. No generated Hybrid B font geometry.
const fontReady=new Promise((resolve,reject)=>fontLoader.load('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/fonts/helvetiker_bold.typeface.json',resolve,undefined,reject));
function glb(url){return new Promise((resolve,reject)=>modelLoader.load(url,g=>resolve(g.scene),undefined,reject))}
let displayTextureLoaded=false;
const assetReady=Promise.all([glb('./assets/models/stairmaster-frame.glb'),glb('./assets/models/stairmaster-step.glb')]).then(([frame,step])=>{
 frame.name='Dedicated StairMaster frame';modelGroup.add(frame);
 // Merge 27 pieces into one tread draw call, retaining its vertex colours.
 let treadTemplate=step;
 try {
  const result=batchStairStep(step);
  treadTemplate=result.mesh;
  console.info(`THE ASCENT: batched ${result.components} tread parts into one mesh`);
 } catch(error) {
  console.warn('Tread batching unavailable; using original step meshes',error);
 }
 for(let i=0;i<16;i++){
  const g=treadTemplate.clone(true);g.name='Animated StairMaster step '+(i+1);
  g.traverse(o=>{if(o.isMesh){
    const prepare=m=>{const copy=m.clone();copy.transparent=true;copy.depthWrite=false;copy.opacity=1;return copy};
    o.material=Array.isArray(o.material)?o.material.map(prepare):prepare(o.material);
  }});
  g.userData.stepMaterials=[];
  g.traverse(o=>{if(o.isMesh)g.userData.stepMaterials.push(...(Array.isArray(o.material)?o.material:[o.material]));});
  modelGroup.add(g);treads.push(g);
 }
 // Material values in the GLBs are opaque; no alpha blending during the scene handoff.
 modelGroup.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  mats.forEach(m=>{m.side=THREE.FrontSide;if(!o.parent?.name?.startsWith('Animated StairMaster step'))m.depthWrite=true});
 }});
 // PNG display texture is a separate editable asset, overlaid on the 3D console.
 const tex=new THREE.TextureLoader().load('./assets/textures/console-display.webp',()=>{
  displayTextureLoaded=true;
  scheduler.invalidate();
 },undefined,(error)=>{
  console.warn('Console display texture failed to load',error);
  displayTextureLoaded=true; // avoid blocking the entire page when network fails
 });
 tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.06,.40),new THREE.MeshBasicMaterial({map:tex,transparent:false,depthWrite:true,side:THREE.DoubleSide}));
 screen.position.set(0,5.74,-2.426);modelGroup.add(screen);
 refineStairmasterCylinders(modelGroup);
 requestAnimationFrame(()=>scheduler.invalidate());
 document.querySelector('#asset-status').textContent='3D StairMaster loaded';setTimeout(()=>{const e=document.querySelector('#asset-status');if(e)e.style.opacity='0';},1600);
}).catch(err=>{displayTextureLoaded=true;console.error('Could not load dedicated 3D assets:',err);document.querySelector('#asset-status').textContent='StairMaster assets could not load. Please serve the complete folder over HTTP.';document.querySelector('#asset-status').style.opacity='1';document.querySelector('#asset-status').style.color='#ffb2a3';});
for(let i=0;i<20;i++){let x=(i%2?1:-1)*(7+i%5*2);box(gym,.16,4+Math.random()*3,.16,x,2,(-i%9)*5,M.dark)}
const floor=box(gym,100,.1,70,0,-.19,0,M.dark);const lines=[];for(let i=-8;i<=8;i++){const l=box(gym,.012,.011,60,i*4,-.12,0,M.metal);l.material=M.metal;lines.push(l)}
// Terrain and distant ranges are actual 3D triangle meshes (not flat pictures).
const mountain=new THREE.Group();scene.add(mountain);
// V2.2: a continuous switchback ascent, rather than 96 floating flat stair blocks.
const pathGroup=new THREE.Group();mountain.add(pathGroup);
const ascentX=z=>-2.4+Math.sin((-z)*.077)*5.4+Math.sin((-z)*.026)*1.0-10.5*smoothstep(((-z)-106)/87)-3.6*smoothstep(((-z)-186)/22);
function smoothstep(x){let a=Math.max(0,Math.min(1,x));return a*a*(3-2*a)}
// The last switchback climbs onto a distinct, highest summit. Terrain beyond it
// falls away rather than continuing uphill and visually swallowing Liam.
const ascentY=z=>{
 const distance=Math.min(212,Math.max(0,-z));
 const climb=2.45+Math.max(0,distance-4)*.285+Math.max(0,distance-143)*.23;
 const summitPush=10.5*smoothstep((distance-170)/23)+8.5*smoothstep((distance-188)/16)+6.2*smoothstep((distance-202)/10);
 return climb+summitPush-Math.max(0,-z-212)*1.35;
};
const pathWidth=z=>2.35+Math.sin((-z)*.11)*.18;
const trailVerts=[],trailUV=[],trailIdx=[],trailColors=[];
const trailStart=-4,trailEnd=-212,trailN=450;
const toneA=new THREE.Color(0xc8d5db),toneB=new THREE.Color(0xf2f7fa),toneC=new THREE.Color(0xa6beca);
for(let i=0;i<=trailN;i++){
 const z=trailStart+(trailEnd-trailStart)*i/trailN,x=ascentX(z),y=ascentY(z);
 const tangent=(ascentX(z-.2)-ascentX(z+.2))/.4;
 const nx=1/Math.sqrt(1+tangent*tangent),nz=tangent*nx;
 const half=pathWidth(z)*.5;
 for(let j=0;j<3;j++){
  const lane=j-1,rough=Math.sin(i*1.17+j*3.7)*.065+Math.cos(i*.51+j*2.3)*.045;
  trailVerts.push(x+nx*half*lane,y+(j===1?.06:-.13)+rough,z+nz*half*lane);
  trailUV.push(j/2,i/trailN*13);
  const tint=(j===1?toneB:(j===0?toneA:toneC)).clone().multiplyScalar(.96+.045*Math.sin(i*.6+j));
  trailColors.push(tint.r,tint.g,tint.b);
 }
 if(i<trailN)for(let j=0;j<2;j++){const k=i*3+j;trailIdx.push(k,k+3,k+1,k+1,k+3,k+4)}
}
const trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.Float32BufferAttribute(trailVerts,3));trailGeo.setAttribute('uv',new THREE.Float32BufferAttribute(trailUV,2));trailGeo.setAttribute('color',new THREE.Float32BufferAttribute(trailColors,3));trailGeo.setIndex(trailIdx);trailGeo.computeVertexNormals();
const trailMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0,side:THREE.FrontSide,transparent:true,opacity:0});pathGroup.add(new THREE.Mesh(trailGeo,trailMat));
// Terrain height is shared by the mountain surface and all placed details.
function terrainHeight(x,z){
 const center=ascentX(z),side=x-center,dist=Math.abs(side);
 const base=ascentY(z)-.46;
 const ripples=Math.sin(x*.61+z*.24)*.36+Math.cos(x*.27-z*.34)*.43+Math.sin(x*.14+z*.64)*.23;
 const ordinaryLift=side<0?Math.pow(Math.max(0,dist-1.0),1.18)*.42:-Math.pow(Math.max(0,dist-1.0),1.08)*.67;
 const endFactor=smoothstep(((-z)-164)/29);
 // Both sides of the ultimate ridge now drop away, leaving the summit itself
 // unmistakably the tallest visible piece of near terrain.
 const summitFall=-Math.pow(Math.max(0,dist-1.0),1.12)*.88;
 const lift=ordinaryLift*(1-endFactor)+summitFall*endFactor;
 const edgeBlend=Math.min(1,Math.max(0,(dist-1.05)/2.8));
 return base+lift+ripples*edgeBlend*(1-.75*endFactor);
}
const terrainGeo=new THREE.PlaneGeometry(190,340,154,250);terrainGeo.rotateX(-Math.PI/2);
const pos=terrainGeo.attributes.position;
for(let i=0;i<pos.count;i++){
 const x=pos.getX(i),z=pos.getZ(i)-101;pos.setZ(i,z);pos.setY(i,terrainHeight(x,z));
}
terrainGeo.computeVertexNormals();mountain.add(new THREE.Mesh(terrainGeo,M.ice));
// Rocks are planted into the actual snow surface, not estimated at trail height.
for(let i=0;i<142;i++){
 const z=-7-i*1.45,center=ascentX(z);
 const side=i%2?1:-1,offset=2.6+((i*17)%13)*.27;
 const x=center+side*offset+Math.sin(i*2.4)*.25;
 const radius=.18+((i*7)%9)*.063;
 const shard=new THREE.Mesh(new THREE.DodecahedronGeometry(radius,0),i%6===0?M.ice:M.rock);
 shard.position.set(x,terrainHeight(x,z)-radius*.36,z);
 shard.rotation.set(i*.17,i*.49,i*.23);
 shard.scale.set(1,.45+((i*5)%7)*.09,1.1);
 pathGroup.add(shard);
 if(i%21===0){
  const mx=center+side*1.48,my=terrainHeight(mx,z);
  const marker=box(pathGroup,.055,.65,.055,mx,my+.3,z,M.stone);
  marker.rotation.z=side*.095;
  box(pathGroup,.23,.12,.025,mx+.12,my+.5,z,M.lime);
 }
}
// Finale: trail climbs left onto the highest exposed pinnacle, with open air
// on both sides and a drop-off beyond the tip.
const summitZ=-212,summitX=ascentX(summitZ),summitY=ascentY(summitZ);
const summit=new THREE.Group();summit.position.set(summitX,summitY,summitZ);mountain.add(summit);
// V3.1 Natural summit: smooth, wind-weathered stone with irregular snow pockets.
// Material/geometry remains procedural and requires no external model download.
const weatheredStone=new THREE.MeshStandardMaterial({color:0x465c68,roughness:.98,metalness:0,flatShading:false,vertexColors:true});
const summitSnow=new THREE.MeshStandardMaterial({color:0xeaf3f5,roughness:.96,metalness:0,flatShading:false});
function organicRock(parent, center, radius, squish, seed, snowy=false){
 const g=new THREE.IcosahedronGeometry(radius,3);
 const a=g.getAttribute('position'), colors=[];
 const stone=new THREE.Color('#4b6370'),slate=new THREE.Color('#758a91'),bright=new THREE.Color('#b0bbc0');
 const v=new THREE.Vector3();
 for(let i=0;i<a.count;i++){
  v.fromBufferAttribute(a,i);
  const n=Math.sin(v.x*2.12+seed)*Math.cos(v.z*1.74-seed)*.12+
          Math.sin(v.y*3.81+v.x*.81+seed*2.3)*.07+
          Math.cos(v.z*5.13-v.y*1.7)*.035;
  const f=1+n;
  v.set(v.x*f*squish[0],v.y*f*squish[1],v.z*f*squish[2]);
  a.setXYZ(i,v.x,v.y,v.z);
  const tint=Math.max(0,Math.min(1,(v.y/radius+1)*.5+Math.sin(v.x*1.8+v.z*.7+seed)*.12));
  const c=stone.clone().lerp(slate,tint*.66).lerp(bright,Math.max(0,tint-.75)*.5);
  colors.push(c.r,c.g,c.b);
 }
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
 const rock=new THREE.Mesh(g,weatheredStone);rock.position.set(...center);parent.add(rock);
 if(snowy){
  // A fine, rounded snow crust follows the highest rock surface.
  const snowGeo=new THREE.SphereGeometry(radius*.99,30,18,0,Math.PI*2,0,Math.PI*.49);
  snowGeo.scale(squish[0]*1.02,squish[1]*.33,squish[2]*1.02);
  const snow=new THREE.Mesh(snowGeo,summitSnow);
  snow.position.set(center[0],center[1]+radius*squish[1]*.77,center[2]);parent.add(snow);
 }
 return rock;
}
// Narrow high crown with textured stone falling away below Liam.
const summitBaseRock=organicRock(summit,[0,-7.7,-.30],7.1,[.67,1.03,.79],.7,false);
const summitCrownRock=organicRock(summit,[.12,-.30,-.30],1.01,[.75,.33,.70],2.2,false);
// The final access spur remains attached to the ridgeline and disappears into the crown.
const accessLedge=new THREE.Mesh(new THREE.BoxGeometry(1.1,.22,3.6),summitSnow);
accessLedge.position.set(0,-.74,1.55);accessLedge.rotation.x=-.32;summit.add(accessLedge);
// Smooth rock outcrops, embedded rather than triangular spikes.
for(let i=0;i<10;i++){
 const a=i*Math.PI*2/10,r=1.95+(i%3)*.52;
 organicRock(summit,[Math.cos(a)*r,-2.9-(i%3)*.32,Math.sin(a)*r-.4],1.35+(i%3)*.3,
  [.7+(i%3)*.12,1.45,.8],i*.9,false);
}
// V4.7: Replace the procedural summit figure with the user's detailed GLB climber.
// The supplied asset is Z-up (height 2.47m). Rotate it once into Three.js Y-up.
// Its feet sit at Y≈0 on the existing irregular summit rock; no round platform.
const climber=new THREE.Group();climber.name='Summit character and flag';
climber.position.set(-.22,0,-.35);climber.rotation.y=Math.PI;summit.add(climber); // show the climber's back; flag turns with his raised hand
const climberModelRoot=new THREE.Group();climber.add(climberModelRoot);
climberModelRoot.rotation.x=-Math.PI/2;
const climberReady=glb('./assets/models/character.glb').then(model=>{
 model.name='Character';
 climberModelRoot.add(model);
 model.updateMatrixWorld(true);
 // The uploaded GLB is Z-up; its measured foot plane is at local Z=+0.016m.
 // Do NOT subtract a world-space AABB minimum: that buries the climber under Everest.
 climberModelRoot.position.y=-.016;
 climberModelRoot.updateMatrixWorld(true);
 // The GLB's boots do not have a reliable zero-height pivot. Measure their
 // actual world-space lowest extent, then place that at the real rock surface.
 summit.updateMatrixWorld(true);
 climberModelRoot.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(climberModelRoot);
 const downward=new THREE.Raycaster();
 const hits=[];
 // Samples directly below the boots / stance, restricted to the solid summit
 // rock (not snow caps or the approach path).
 for(const dx of [-.18,0,.18]){
  const origin=summit.localToWorld(new THREE.Vector3(climber.position.x+dx,5,climber.position.z));
  downward.set(origin,new THREE.Vector3(0,-1,0));
  const hit=downward.intersectObjects([summitCrownRock,summitBaseRock],false)[0];
  if(hit)hits.push(hit.point.y);
 }
 if(hits.length){
  // Highest boot support point prevents either boot floating above the crown.
  const groundY=Math.max(...hits);
  // Lower the boots by a small additional amount to visually seat both soles
  // into the flatter top rock, rather than leaving a visible air gap.
  climber.position.y+=(groundY-bounds.min.y)-.095;
  climber.updateMatrixWorld(true);
  console.info('THE ASCENT: summit boots aligned to rock', {groundY, feetBefore:bounds.min.y, newHeight:climber.position.y});
 }else{
  console.warn('Summit grounding ray missed; using fallback boot height');
  climber.position.y=-.125;
 }
 requestAnimationFrame(()=>scheduler.invalidate());
 document.documentElement.dataset.climber='loaded';
 document.documentElement.dataset.characterAsset='character.glb';
 console.info('THE ASCENT: detailed climber loaded',bounds.min,bounds.max);
}).catch(error=>{document.documentElement.dataset.climber='load-error';console.error('Detailed summit climber failed to load',error)});
// The model's raised RIGHT glove is at x≈-.56, y≈2.40, z≈+.18 after Z-up conversion.
// Mount the flag grip exactly there; pole extends through the glove, not into open air.
const summitPoleMat=new THREE.MeshStandardMaterial({color:0x435964,metalness:.73,roughness:.28});
const flagPole=box(climber,.030,2.55,.030,-.56,2.60,.18,summitPoleMat);
const flagGeo=new THREE.PlaneGeometry(1.35,.66,20,8);flagGeo.translate(.675,0,0);
const flagMat=new THREE.MeshStandardMaterial({color:0xc52e2d,roughness:.86,side:THREE.DoubleSide});
const flag=new THREE.Mesh(flagGeo,flagMat);flag.position.set(-.56,3.51,.18);climber.add(flag);
const flagBase=flagGeo.attributes.position.array.slice();
function peak(group,x,z,height,radius,seed){let g=new THREE.ConeGeometry(radius,height,5,6);let a=g.attributes.position;for(let i=0;i<a.count;i++){let y=a.getY(i),v=(Math.sin(i*7.1+seed)*.08+Math.cos(i*2.3+seed)*.07);a.setX(i,a.getX(i)*(1+v));a.setZ(i,a.getZ(i)*(1+v));if(y<height*.34)a.setY(i,y+v*height*.12)}g.computeVertexNormals();const mesh=new THREE.Mesh(g,M.rock);mesh.position.set(x,height*.5-4,z);group.add(mesh);const cap=new THREE.Mesh(new THREE.ConeGeometry(radius*.43,height*.46,5,4),M.snow);cap.position.set(x,height*.77-4,z);group.add(cap)}
for(let i=0;i<23;i++){let x=(i%2?1:-1)*(12+(i*17%55));let z=-12-(i*19%145);peak(mountain,x,z,14+(i*13%38),7+(i*3%15),i)}peak(mountain,28,-226,73,38,7);peak(mountain,-62,-218,49,29,3);peak(mountain,72,-238,57,33,5);
const snowCount=1150,particles=new Float32Array(snowCount*3);
for(let i=0;i<snowCount;i++){
 particles[i*3]=(Math.random()-.5)*100;
 particles[i*3+1]=Math.random()*45;
 particles[i*3+2]=-Math.random()*185;
}
// Retain the original random distribution. Reusing one packed typed array keeps
// the snowfall animation inexpensive and avoids allocations each frame.
const snowOrigins=particles.slice();
const pGeo=new THREE.BufferGeometry();
const snowPositions=new THREE.BufferAttribute(particles,3);
snowPositions.setUsage(THREE.DynamicDrawUsage);
pGeo.setAttribute('position',snowPositions);
const flakes=new THREE.Points(pGeo,new THREE.PointsMaterial({color:0xebf7ff,size:.13,transparent:true,opacity:.7,depthWrite:false}));
mountain.add(flakes);
function animateMountainSnow(now){
 const seconds=now*.001;
 const positions=snowPositions.array;
 for(let i=0;i<snowCount;i++){
  const j=i*3;
  const seed=i*.618;
  // Fall and wrap within the original 45-unit field, with gentle wind drift.
  const speed=1.8+(i%11)*.31;
  positions[j]=snowOrigins[j]+Math.sin(seconds*.35+seed)*.55+seconds*.035*(i%3-1);
  positions[j+1]=((snowOrigins[j+1]-seconds*speed)%45+45)%45;
  positions[j+2]=snowOrigins[j+2]+Math.sin(seconds*.22+seed*.43)*.34;
 }
 snowPositions.needsUpdate=true;
}
const skyBlue=new THREE.Color('#6a9caf'),dark=new THREE.Color('#0b171b'),fogDark=new THREE.Color('#101d22'),fogBlue=new THREE.Color('#adc8d4');const clamp=THREE.MathUtils.clamp;const smooth=(a,b,v)=>{let t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};const mix=(a,b,t)=>a+(b-a)*t;
const keypoints=[
 {t:0,pos:[4.3,3.8,7.3],look:[0,2.85,-.55],fov:40},
 // Hold the same opening console angle, then begin a smoother drop toward the upper stair gap.
 {t:.055,pos:[1.15,3.76,6.8],look:[0,2.92,-.60],fov:39},
 {t:.13,pos:[.28,3.70,6.05],look:[0,3.03,-.82],fov:36},
 {t:.27,pos:[.10,3.58,5.08],look:[0,3.14,-1.26],fov:34},
 // Start aiming at the opening beneath the console instead of peeling past the machine.
 {t:.34,pos:[.38,3.62,3.08],look:[0,3.72,-2.65],fov:55},
 // V7.3: rise above the upper stairs and align with the centre of the
 // physical Everest goal screen. The first part of the StairMaster journey
 // is unchanged; the new route starts only after the final stair message.
 {t:.39,pos:[.16,4.98,1.15],look:[0,5.74,-2.426],fov:49},
 {t:.435,pos:[.04,5.69,-.22],look:[0,5.74,-2.426],fov:46},
 // Glide straight INTO the display (rather than into the gap below it).
 // The mist/snow wipe conceals the moment the camera crosses its plane.
 {t:.475,pos:[.005,5.74,-1.91],look:[0,5.74,-2.426],fov:43},
 {t:.49,pos:[0,5.74,-2.39],look:[0,5.74,-8],fov:48},
 // Continue in the same forward direction as the mountain emerges from mist.
 {t:.56,pos:[.65,7.6,-12.5],look:[0,7.6,-26],fov:66},
 {t:.64,pos:[4.6,13.6,-25],look:[ascentX(-48),ascentY(-48),-48],fov:64},
 {t:.76,pos:[4.0,28,-75],look:[ascentX(-121),ascentY(-121),-121],fov:55},
 {t:.87,pos:[ascentX(-148)+10,ascentY(-148)+8,-141],look:[ascentX(-186),ascentY(-186)+1.4,-186],fov:51},
 // Distinct final summit push up the last steeper section.
 {t:.95,pos:[summitX+15,summitY+7.6,summitZ+28],look:[summitX-1.0,summitY+3.2,summitZ+1],fov:45},
 // Final hero shot: behind Liam, close to the tip, so he reads as standing on the highest point.
 {t:1,pos:[summitX+2.2,summitY+2.55,summitZ+8.8],look:[summitX-.15,summitY+1.95,summitZ-4.2],fov:39}
 ];
// Camera path is isolated for maintainability. V7.3 replaces only the under-console exit with a screen-centred portal move.
const sample=createCameraSampler(keypoints,{clamp,smooth,mix,lastGymKey:8,flowing:true});

// V3.2: upright, world-space messages floating above real StairMaster steps.
// The labels are separate XY planes (not projected flat onto the treads).
const stairStories=[
 {eyebrow:'MEET LIAM',line:'HEY, I\'M LIAM.',sub:'ALWAYS MOVING. ALWAYS AIMING HIGHER.',begin:.032,end:.112},
 {eyebrow:'THE DREAM',line:'MOUNT EVEREST.',sub:'THE BIGGEST DREAM STARTS SMALL.',begin:.105,end:.192},
 {eyebrow:'THE CHALLENGE',line:'EVERY STEP COUNTS.',sub:'8,849 METRES. ONE STEP AT A TIME.',begin:.185,end:.294}
];
// Extruded typography throughout: each line is actual 3D geometry, not a textured plane.
// Character spacing is controlled per glyph rather than squeezing letters into the tread width.
function mixHex(a,b,t){const ca=new THREE.Color(a),cb=new THREE.Color(b);return ca.lerp(cb,t)}
function smooth01(x){return x<=0?0:x>=1?1:x*x*(3-2*x)}
function applyVerticalFaceGradient(geo, topHex, midHex, bottomHex, shineHex){
 // A deliberately high-contrast vertical metal gradient. The highlights are baked
 // into vertex colors, so they remain visible even without specular reflections.
 geo.computeBoundingBox();
 const bb=geo.boundingBox;
 const pos=geo.attributes.position;
 const colors=[];
 const h=Math.max(.0001,bb.max.y-bb.min.y);
 const cTop=new THREE.Color(topHex),cMid=new THREE.Color(midHex),cBot=new THREE.Color(bottomHex);
 const cShine=new THREE.Color(shineHex||topHex);
 for(let i=0;i<pos.count;i++){
  const t=(pos.getY(i)-bb.min.y)/h;
  let c;
  if(t<.46){
   c=cBot.clone().lerp(cMid,smooth01(t/.46));
  }else{
   c=cMid.clone().lerp(cTop,smooth01((t-.46)/.54));
  }
  // Sharp but softened reflective streak near the upper third.
  const highlight=Math.exp(-Math.pow((t-.78)/.105,2));
  c.lerp(cShine,highlight*.60);
  // Darker footing adds separation from the black extruded sidewalls.
  const lowShade=1-smooth01(t/.14);
  c.lerp(cBot,lowShade*.30);
  colors.push(c.r,c.g,c.b);
 }
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
}
function buildTrackedType(parent, content, font, opts){
 const group=new THREE.Group();group.name='3D lettering: '+content;
 const chars=[...content.toUpperCase()];
 const letterGap=opts.tracking ?? .014;
 const thickness=opts.depth ?? .035;
 let cursor=0;
 // ONE mesh for every glyph: the bevel is part of the geometry itself.
 // Previously an expanded outline and offset backing duplicated each letter,
 // creating the uncomfortable ghosted / double-vision effect.
 const face=new THREE.MeshPhysicalMaterial({
  color:0xffffff,vertexColors:true,metalness:opts.metalness ?? .22,roughness:opts.roughness ?? .20,
  envMap:studioReflection,envMapIntensity:opts.envMapIntensity ?? .7,
  clearcoat:opts.clearcoat ?? .78, clearcoatRoughness:opts.clearcoatRoughness ?? .20,
  sheen:opts.sheen ?? .55, sheenRoughness:opts.sheenRoughness ?? .45,
  emissive:opts.emissive ?? 0x08151c,emissiveIntensity:opts.emissiveIntensity ?? .035,
  transparent:true,opacity:1,depthWrite:true
 });
 const sides=new THREE.MeshStandardMaterial({
  color:opts.sideColor??0x080d12,metalness:opts.sideMetalness ?? .24,roughness:opts.sideRoughness ?? .40,
  envMap:studioReflection,envMapIntensity:opts.sideEnvIntensity ?? .18,
  transparent:true,opacity:1,depthWrite:true
 });
 for(const char of chars){
  if(char===' '){cursor+=opts.size*.38+letterGap;continue;}
  const geo=new TextGeometry(char,{
   font,size:opts.size,depth:thickness,curveSegments:12,
   bevelEnabled:true,bevelThickness:Math.min(thickness*.11,.007),
   bevelSize:Math.min(opts.size*.012,.0045),bevelSegments:3
  });
  geo.computeBoundingBox();const bb=geo.boundingBox;
  const w=bb.max.x-bb.min.x;
  applyVerticalFaceGradient(
    geo,
    opts.highlightTop ?? opts.color,
    opts.color,
    opts.shadowBottom ?? mixHex(opts.color,0x56636b,.22),
    opts.shineColor ?? opts.highlightTop ?? opts.color
  );
  geo.translate(-bb.min.x,0,0);
  // Face and dark sidewalls produce physical depth without duplicate contours.
  const glyph=new THREE.Mesh(geo,[face,sides]);glyph.position.x=cursor;
  group.add(glyph);cursor+=w+letterGap;
 }
 const width=Math.max(.01,cursor-letterGap);
 const scale=Math.min(opts.maxScale??1,(opts.targetWidth??3)/width);
 group.scale.setScalar(scale);group.position.set(-width*scale/2,opts.y,opts.z??0);
 parent.add(group);
 return {group,materials:[face,sides]};
}
function makeStairText(item,font){
 const root=new THREE.Group();root.name='Floating 3D chapter: '+item.eyebrow;
 const title=buildTrackedType(root,item.line,font,{
  size:.27,tracking:.023,depth:.078,targetWidth:2.83,maxScale:1,
  y:-.10,z:.05,color:0xb2c5d0,highlightTop:0xffffff,shadowBottom:0x435866,shineColor:0xffffff,
  sideColor:0x05090d,metalness:.26,roughness:.17,sideMetalness:.28,sideRoughness:.34,
  clearcoat:.98,clearcoatRoughness:.12,sheen:.52,sheenRoughness:.38,envMapIntensity:.94,sideEnvIntensity:.20,
  emissive:0x0a1820,emissiveIntensity:.03
 });
 const eyebrow=buildTrackedType(root,item.eyebrow,font,{
  size:.105,tracking:.032,depth:.031,targetWidth:3.1,maxScale:1,
  y:.47,z:.07,color:0xc1d94d,highlightTop:0xf9ffce,shadowBottom:0x53672b,shineColor:0xfcffe0,
  sideColor:0x0d1208,metalness:.20,roughness:.22,sideMetalness:.20,sideRoughness:.40,
  clearcoat:.83,clearcoatRoughness:.16,sheen:.42,sheenRoughness:.5,envMapIntensity:.72,sideEnvIntensity:.13,
  emissive:0x223111,emissiveIntensity:.022
 });
 const subtitle=buildTrackedType(root,item.sub,font,{
  size:.092,tracking:.020,depth:.029,targetWidth:3.88,maxScale:1,
  y:-.45,z:.07,color:0xb7c6cd,highlightTop:0xffffff,shadowBottom:0x4e606c,shineColor:0xffffff,
  sideColor:0x060b10,metalness:.20,roughness:.22,sideMetalness:.18,sideRoughness:.42,
  clearcoat:.81,clearcoatRoughness:.18,sheen:.4,sheenRoughness:.52,envMapIntensity:.65,sideEnvIntensity:.12,
  emissive:0x101b22,emissiveIntensity:.018
 });
 root.userData.storyMaterials=[...title.materials,...eyebrow.materials,...subtitle.materials];
 // Two small studio lights move with this particular stair's lettering.
 // The lights are switched off when that chapter is hidden.
 const leftLight=new THREE.PointLight(0xf8fdff,1.4,3.5,2);
 leftLight.position.set(-.85,.8,1.45);root.add(leftLight);
 const rightLight=new THREE.PointLight(0xb8e4f4,.85,3.2,2);
 rightLight.position.set(1.05,-.25,1.15);root.add(rightLight);
 root.userData.storyLights=[leftLight,rightLight];
 root.rotation.set(0,0,0);gym.add(root);
 return root;
}
const stairStoryMeshes=stairStories.map(()=>null);
fontReady.then(font=>{
 stairStories.forEach((item,i)=>{stairStoryMeshes[i]=makeStairText(item,font)});
 requestAnimationFrame(()=>scheduler.invalidate());
}).catch(err=>{console.warn('Story font failed to load',err);});

// A message receives ONE fixed physical tread for its entire chapter. The old
// nearest-tread selection reattached it to a new step and caused visible jumps.
function stairCycleAt(scroll){return smooth(0,.34,Math.min(scroll,.34))*17}
const storyTreadIndices=stairStories.map(item=>{
 const startCycle=stairCycleAt(item.begin);
 // Start just above the centre; the tread travels continuously downward
 // through the full message interval without crossing the belt's wrap point.
 return ((Math.round(startCycle+10)%16)+16)%16;
});
function updateStairStories(scroll,cycle){
 const gymAmount=1-smooth(.325,.36,scroll);
 stairStoryMeshes.forEach((label,index)=>{
  if(!label) return;
  const it=stairStories[index],enter=smooth(it.begin-.008,it.begin+.018,scroll),
        leave=smooth(it.end-.022,it.end+.012,scroll);
  const tread=treads[storyTreadIndices[index]];
  if(tread && label.parent!==tread){
   tread.attach(label); // preserve world pose for this frame, then lock local pose
   label.position.set(0,.78,.12);
   label.rotation.set(0,0,0); // upright on the Y axis, facing the viewer
  }
  const alpha=enter*(1-leave)*gymAmount;
  label.visible=!!tread && tread.visible && alpha>.01;
  // Gentle scroll-linked light sweep across the bevels; no automatic animation.
  const localProgress=Math.min(1,Math.max(0,(scroll-it.begin)/(it.end-it.begin)));
  const storyLights=label.userData.storyLights||[];
  if(storyLights[0]){
   storyLights[0].position.x=-1.3+localProgress*2.15;
   storyLights[0].intensity=1.4*alpha;
  }
  if(storyLights[1])storyLights[1].intensity=.85*alpha;
  for(const mat of label.userData.storyMaterials||[]){
   mat.transparent=true;mat.opacity=alpha;mat.depthWrite=alpha>.95;
  }
 });
}

// Screen-space snow starts while the StairMaster is still in view, before the white mist handoff.
const snowCanvas=document.getElementById('snowstorm'),snowCtx=snowCanvas.getContext('2d');
let snowW=1,snowH=1,snowDpr=1;
const blizzard=Array.from({length:200},(_,i)=>({
 x:((i*73.73)%101)/101,y:((i*41.17)%103)/103,
 size:1.2+(i%7)*.47,speed:.08+(i%11)*.012,
 drift:((i*29)%13-6)*.0017,depth:.35+(i%9)/10
}));
function sizeSnow(){snowDpr=Math.min(devicePixelRatio||1,1.5);snowW=innerWidth;snowH=innerHeight;
 snowCanvas.width=Math.max(1,Math.round(snowW*snowDpr));snowCanvas.height=Math.max(1,Math.round(snowH*snowDpr));
 snowCtx.setTransform(snowDpr,0,0,snowDpr,0,0);
}
function paintSnow(now,amount){
 snowCtx.clearRect(0,0,snowW,snowH);
 if(amount<.003)return;
 snowCtx.fillStyle='#ffffff';
 for(const f of blizzard){
  const x=((f.x+now*.00013*f.drift*60+1)%1)*snowW;
  const y=((f.y+now*.001*f.speed)%1)*snowH;
  const r=f.size*(.55+.5*f.depth);snowCtx.globalAlpha=Math.min(.96,amount*(.35+.52*f.depth));
  snowCtx.beginPath();snowCtx.arc(x,y,r,0,Math.PI*2);snowCtx.fill();
 }
 snowCtx.globalAlpha=1;
}
sizeSnow();
let lastScrollActivity=performance.now();
const journey=document.querySelector('#journey'),texts=[...document.querySelectorAll('.stagecopy')],counter=document.querySelector('#counter-num'),progress=document.querySelector('#progress'),hint=document.querySelector('#scrollhint');let current=0,target=0,prev=performance.now();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function resize(){let w=innerWidth,h=innerHeight;quality.resize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();sizeSnow()}addEventListener('resize',resize);resize();const summitStory=document.getElementById('summit-story'),summitScrim=document.getElementById('summit-scrim');
const SUMMIT_SCROLL_SCREENS=2.35;
let summitStoryProgress=0;
// Orbit should finish only when the beginning of the first summit story block
// reaches the upper reading area (rather than while it is still near the bottom).
let summitOrbitFinishProgress=.55;
function onScroll(){
 lastScrollActivity=performance.now();
 const rect=journey.getBoundingClientRect();
 const scrolled=Math.max(0,-rect.top);
 // Keep the established camera coordinates, but remap the under-console scroll interval.
 const cameraTravel=innerHeight*6;
 const summitTravel=innerHeight*SUMMIT_SCROLL_SCREENS;
 // Preserve the first three StairMaster messages, then compress just the
 // under-console / blizzard passage so Everest arrives with fewer scrolls.
 const rawCameraProgress=clamp(scrolled/cameraTravel,0,1);
 // V6.2: compress the passage after EVERY STEP COUNTS even further.
 // Keep the three message beats untouched and accelerate the same under-console camera path.
 const cameraWarp = rawCameraProgress<=.29 ? rawCameraProgress
   : rawCameraProgress<=.36 ? .29+(rawCameraProgress-.29)*(.53-.29)/(.36-.29)
   : .53+(rawCameraProgress-.36)*(1-.53)/(1-.36);
 target=cameraWarp;
 summitStoryProgress=clamp((scrolled-cameraTravel)/summitTravel,0,1);
 const storyHeight=summitStory.offsetHeight;
 // Stop with the final mission block resting at the lower edge of the viewport;
 // never move it off the top or fade it out before the contact form arrives.
 const storyStartY=innerHeight+60;
 const storyEndY=innerHeight-storyHeight-Math.max(32,innerHeight*.06);
 const storyY=mix(storyStartY,storyEndY,summitStoryProgress);
 // Synchronize the end of the 90° rotation to the actual text's screen position.
 // This also adapts automatically to different screen sizes and text wrapping.
 const firstHeadingTop=Math.max(106,innerHeight*.125);
 summitOrbitFinishProgress=clamp((storyStartY-firstHeadingTop)/(storyStartY-storyEndY),.30,.82);
 summitStory.style.transform=`translate3d(0,${storyY.toFixed(1)}px,0)`;
 // Reveal and then hold the text throughout the final summit -> contact handoff.
 const storyFade=smooth(0,.065,summitStoryProgress);
 summitStory.style.opacity=String(storyFade);
 summitScrim.style.opacity=String(smooth(0,.12,summitStoryProgress));
 progress.style.width=(clamp(scrolled/(cameraTravel+summitTravel),0,1)*100)+'%';
 hint.style.opacity=String(1-smooth(.04,.17,target));
 counter.textContent=String(Math.floor(target*8849)).padStart(4,'0');
 texts.forEach((e,i)=>{
 const from=+e.dataset.from,to=+e.dataset.to,span=Math.max(.01,to-from);
 const entry=smooth(from-.075,from+.035,target),leave=smooth(to-.075,to+.025,target);
 const fade=entry*(1-leave);
 // Alternating entrances: odd chapters arrive from the right, even from the left.
 const direction=i%2===0?-1:1;
 const entranceX=direction*(1-entry)*Math.min(innerWidth*.26,245);
 const departureX=direction*leave*Math.min(innerWidth*.20,155);
 const glide=(target-from)/span-.5;
 const parallaxY=(1-entry)*28+glide*-24+leave*-16;
 e.style.opacity=String(fade*(1-smooth(0,.035,summitStoryProgress)));
 e.style.setProperty('--story-x',(entranceX+departureX)+'px');
 e.style.setProperty('--story-y',parallaxY+'px');
 e.style.setProperty('--story-scale',String(.955+.045*entry-.015*leave));
 e.style.setProperty('--story-blur',((1-entry)*3.5+leave*2.2)+'px');
})}addEventListener('scroll',onScroll,{passive:true});onScroll();
// The story and mission now live inside a sticky 3D scene, so anchor links
// scroll to their intended reveal moments instead of the old white section.
document.querySelectorAll('header a[href="#story"],header a[href="#mission"]').forEach(link=>{
 link.addEventListener('click',ev=>{
  ev.preventDefault();
  const offset=link.getAttribute('href')==='#story'?.18:.78;
  const journeyTop=journey.getBoundingClientRect().top+scrollY;
  scrollTo({top:journeyTop+innerHeight*(6+offset*SUMMIT_SCROLL_SCREENS),behavior:reduced?'auto':'smooth'});
 });
});
const transitionMist=document.getElementById('transition-veil');
let stormActive=false;
function draw(now){
 let dt=Math.min(.05,(now-prev)/1000);prev=now;
 current+=(target-current)*(reduced?1:Math.min(1,dt*4.6));
 if(Math.abs(target-current)>0.00015)scheduler.invalidate();
 const t=current,transition=smooth(.41,.60,t);
 // A brief opaque mist wipe separates the gym and the mountain; no transparent polygons.
 const mist=transitionMist;
 mist.style.opacity=String(Math.pow(Math.max(0,1-Math.abs(t-.50)/.11),1.15)*.97);
 // Gentle flakes first (.32), snowstorm builds (.42), remains during the white-out, then clears.
 const storm=smooth(.31,.45,t)*(1-smooth(.55,.69,t));
 stormActive=storm>.003;
 snowCanvas.style.opacity=String(storm);
 if(storm>.003)paintSnow(now,storm);
 else if(snowCtx && snowCanvas.dataset.cleared!=='yes'){snowCtx.clearRect(0,0,snowW,snowH);snowCanvas.dataset.cleared='yes';}
 if(storm>.003)snowCanvas.dataset.cleared='no';
 gym.visible=t<.505;mountain.visible=t>=.505;
 scene.background.copy(dark).lerp(skyBlue,smooth(.43,.69,t)*.85);
 scene.fog.color.copy(fogDark).lerp(fogBlue,smooth(.43,.75,t));
 scene.fog.density=mix(.016,.006,smooth(.45,.8,t));
 // Scene-level culling: don't update hidden staircase geometry once Everest is visible.
 if(gym.visible){
  const cycle=stairCycleAt(t); // Scroll-controlled belt, never autoplay.
  for(let i=0;i<treads.length;i++){
   const q=((i-cycle)%16+16)%16;
   treads[i].position.set(0,.55+q*.275,2.55-q*.38);
   const alpha=smooth(.05,1.5,q)*(1-smooth(14,15.95,q));
   treads[i].visible=alpha>.008;
   for(const mat of treads[i].userData.stepMaterials||[])mat.opacity=alpha;
  }
  updateStairStories(t,cycle);
 }
 // Shared material state is configured once during setup, not rewritten every frame.
 flakes.material.opacity=smooth(.52,.74,t)*.52;
 if(mountain.visible){
 animateMountainSnow(now);
 const fa=flagGeo.attributes.position;
 const windPhase=now*.0022;
 for(let i=0;i<fa.count;i++){
  const bx=flagBase[i*3], by=flagBase[i*3+1], bz=flagBase[i*3+2];
  const u=bx/1.55; // anchored at the pole edge, freer toward the outer edge.
  const amp=Math.pow(Math.max(0,u),1.35);
  // Reversed spatial phase makes the wave travel away from the pole (toward +X).
  const wave=Math.sin(windPhase-u*6.3+by*2.1)*0.11 + Math.sin(windPhase*1.7-u*11.5)*0.035;
  fa.setX(i,bx + amp*0.018*Math.sin(windPhase*1.2-u*2.4+by*3.4));
  fa.setY(i,by + amp*0.035*Math.cos(windPhase*1.45-u*5.8));
  fa.setZ(i,bz + amp*wave);
 }
 fa.needsUpdate=true;flagGeo.computeVertexNormals();
 }
 // Console-first opening: preserve the existing camera's side angle (X/Z position)
 // and ease an elevated eye line back into the untouched original scroll path.
 // The console texture occupies (0, 5.74, -2.426) in the StairMaster model.
 const p=sample(t);
 const consoleIntro=1-smooth(0,.075,t);
 const rise=consoleIntro*2.75;
 const openingPos=[p.pos[0],p.pos[1]+rise,p.pos[2]];
 const openingLook=[p.look[0],p.look[1]+consoleIntro*2.89,p.look[2]-consoleIntro*1.876];
 // V5.9: while the summit story starts to rise, orbit counterclockwise around
 // Liam by 90 degrees. Reframe by aiming slightly LEFT of him so his figure and
 // flag occupy the open RIGHT side of the screen, away from the story text.
 // Do not touch the earlier mountain flight or the final pre-story hero view.
 const storyTurn=smooth(.012,summitOrbitFinishProgress,summitStoryProgress);
 if(storyTurn>0){
  const pivot=new THREE.Vector3(summitX-.22,summitY+1.70,summitZ-.35);
  const start=new THREE.Vector3(...openingPos);
  const relX=start.x-pivot.x,relZ=start.z-pivot.z;
  const angle=storyTurn*Math.PI*.5;  // positive = counterclockwise viewed from above
  const c=Math.cos(angle),s=Math.sin(angle);
  const orbitPos=new THREE.Vector3(pivot.x+relX*c-relZ*s,start.y,pivot.z+relX*s+relZ*c);
  // At 90 degrees the camera looks across the rock toward Liam's left profile.
  // Shifting the aim against camera-right naturally places Liam on screen-right.
  const towards=pivot.clone().sub(orbitPos).normalize();
  const cameraRight=new THREE.Vector3().crossVectors(towards,new THREE.Vector3(0,1,0)).normalize();
  const framingOffset=(innerWidth<800?1.55:3.35)*storyTurn;
  const orbitAim=pivot.clone().addScaledVector(cameraRight,-framingOffset);
  const originalAim=new THREE.Vector3(...openingLook);
  const aim=originalAim.lerp(orbitAim,storyTurn);
  camera.position.copy(orbitPos);
  camera.lookAt(aim);
 }else{
  camera.position.set(...openingPos);camera.lookAt(new THREE.Vector3(...openingLook));
 }
 const nextFov=p.fov+(innerWidth<800?9:0);
 if(Math.abs(camera.fov-nextFov)>0.001){camera.fov=nextFov;camera.updateProjectionMatrix();}
 // World snow animates only while the mountain scene is active.
 renderer.render(scene,camera);
 if(!firstFrameDrawn){
   firstFrameDrawn=true;
   Promise.allSettled([assetReady,fontReady]).then(()=>{
     essentialAssetsSettled=true;
     scheduler.invalidate();
   });
 }
 // The fallback is never shown. Remove the overlay only after all visible assets
 // have settled and at least one complete frame has actually been rendered.
 if(essentialAssetsSettled && displayTextureLoaded && !firstUsableFramePending){
   firstUsableFramePending=true;
   requestAnimationFrame(dismissLoader);
 }
 const sampleResult=diagnostics.sample(now,quality.pixelRatio,quality.preset);
 quality.observe(sampleResult,{scrolling:performance.now()-lastScrollActivity<1600});
}

const scheduler=createRenderScheduler(draw,{
  shouldAnimate:()=>!document.hidden && document.visibilityState==='visible' && (mountain.visible || stormActive) && journey.getBoundingClientRect().bottom>0 && journey.getBoundingClientRect().top<innerHeight,
  getInterval:()=>quality.flagFrameInterval,
});
scheduler.start();
// Re-render while scroll-driven camera position is catching up; idle gym is not animated.
const requestSceneUpdate=()=>scheduler.invalidate();
addEventListener('scroll',requestSceneUpdate,{passive:true});
addEventListener('resize',requestSceneUpdate);
document.addEventListener('visibilitychange',()=>{prev=performance.now();scheduler.invalidate();});
window.addEventListener('pageshow',()=>{prev=performance.now();scheduler.invalidate();});
// Loader is dismissed after the first frame and essential asset requests settle.

