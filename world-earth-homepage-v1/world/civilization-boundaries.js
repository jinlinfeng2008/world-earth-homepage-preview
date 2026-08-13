import * as THREE from 'three'

function pointOnGlobe(lon,lat,radius=1.006){
  const phi=THREE.MathUtils.degToRad(90-lat)
  const theta=THREE.MathUtils.degToRad(lon+180)
  return new THREE.Vector3(-radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta))
}

function appendRing(positions,ring){
  for(let i=1;i<ring.length;i++){
    const a=ring[i-1],b=ring[i]
    if(Math.abs(a[0]-b[0])>180) continue
    positions.push(...pointOnGlobe(a[0],a[1]).toArray(),...pointOnGlobe(b[0],b[1]).toArray())
  }
}

// Natural Earth admin-0 is cartographic context, not observed light.
export async function createHomepageCivilizationBoundaries({sunDir,viewRotY}){
  const response=await fetch('/data/homepage-complete-expression-v1/ne_110m_admin_0_countries.geojson')
  if(!response.ok) throw new Error('Natural Earth admin-0 boundary data unavailable')
  const data=await response.json(),primaryPositions=[],secondaryPositions=[]
  for(const feature of data.features){
    const geometry=feature.geometry
    if(!geometry) continue
    const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[]
    const rank=Number(feature.properties?.LABELRANK??feature.properties?.labelrank??9)
    const target=rank<=3?primaryPositions:secondaryPositions
    for(const polygon of polygons) for(const ring of polygon) appendRing(target,ring)
  }
  const makeLines=(positions,opacity)=>{
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
    const material=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,depthTest:true,blending:THREE.NormalBlending,
      uniforms:{sunDir:{value:sunDir.clone()},uOpacity:{value:opacity}},
      vertexShader:`varying vec3 vN;void main(){vN=normalize(mat3(modelMatrix)*position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`precision highp float;uniform vec3 sunDir;uniform float uOpacity;varying vec3 vN;void main(){gl_FragColor=vec4(vec3(.93,.96,1.),uOpacity);}`
    })
    const lines=new THREE.LineSegments(geometry,material);lines.renderOrder=6;return lines
  }
  const group=new THREE.Group(),primary=makeLines(primaryPositions,.18),secondary=makeLines(secondaryPositions,.085)
  group.add(secondary,primary);group.rotation.y=viewRotY
  return {mesh:group,setView(rotationY){group.rotation.y=rotationY},stats:{source:'Natural Earth admin-0',kind:'cartographic-context',primarySegments:primaryPositions.length/6,secondarySegments:secondaryPositions.length/6}}
}
