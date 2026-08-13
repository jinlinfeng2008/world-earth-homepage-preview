import * as THREE from 'three'

const EVENT_URL='/data/aurora-volumetric-v5/historical-event.json'
const EARTH_RADIUS_KM=6371
const MOBILE_HORIZONTAL_GAIN=1.92

function geoDirection(latitudeDeg,longitudeDeg){
  const latitude=THREE.MathUtils.degToRad(latitudeDeg)
  const longitude=THREE.MathUtils.degToRad(longitudeDeg)
  return new THREE.Vector3(Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),-Math.cos(latitude)*Math.sin(longitude))
}

function magneticDirection(radial,pole){
  const axis=geoDirection(pole.latitude,pole.longitude)
  const field=radial.clone().multiplyScalar(3*axis.dot(radial)).sub(axis).normalize()
  return field.dot(radial)<0?field.multiplyScalar(-1):field
}

function circularMean(sectors,index,key,radius=5){
  let total=0,weightTotal=0
  for(let offset=-radius;offset<=radius;offset++){
    const weight=.5+.5*Math.cos(Math.abs(offset)/(radius+1)*Math.PI)
    total+=sectors[(index+offset+sectors.length)%sectors.length][key]*weight
    weightTotal+=weight
  }
  return total/weightTotal
}

function buildCurtain(event,{minimumKm,maximumKm,levels,tracks,widthGain}){
  const positions=[],uvs=[],acrossValues=[],energies=[],confidences=[],phases=[],indices=[]
  const sectors=event.sectors,pole=event.magneticField.geomagneticNorthPole
  const stride=(sectors.length+1)*(levels+1)
  for(let track=0;track<tracks;track++){
    const across=(track+.5)/tracks
    for(let sectorIndex=0;sectorIndex<=sectors.length;sectorIndex++){
      const sector=sectors[sectorIndex%sectors.length]
      const energy=circularMean(sectors,sectorIndex%sectors.length,'energy')
      const confidence=circularMean(sectors,sectorIndex%sectors.length,'confidence',4)
      const latitude=sector.latitude+(across*2.-1.)*sector.width*.5*widthGain
      const radial=geoDirection(latitude,sector.longitude)
      const field=magneticDirection(radial,pole)
      for(let level=0;level<=levels;level++){
        const height=level/levels
        const altitudeKm=THREE.MathUtils.lerp(minimumKm,maximumKm,Math.pow(height,.82))
        const base=minimumKm/EARTH_RADIUS_KM*1.25
        const extrusion=(altitudeKm-minimumKm)/EARTH_RADIUS_KM*3.85
        const position=radial.clone().multiplyScalar(1+base).addScaledVector(field,extrusion)
        positions.push(position.x,position.y,position.z)
        uvs.push(sectorIndex/sectors.length,height)
        acrossValues.push(across);energies.push(energy);confidences.push(confidence);phases.push(sector.phase)
      }
    }
  }
  for(let track=0;track<tracks;track++){
    const trackStart=track*stride
    for(let sectorIndex=0;sectorIndex<sectors.length;sectorIndex++){
      for(let level=0;level<levels;level++){
        const a=trackStart+sectorIndex*(levels+1)+level
        const b=a+(levels+1),c=a+1,d=b+1
        indices.push(a,b,c,b,d,c)
      }
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
  geometry.setAttribute('aAcross',new THREE.Float32BufferAttribute(acrossValues,1))
  geometry.setAttribute('aEnergy',new THREE.Float32BufferAttribute(energies,1))
  geometry.setAttribute('aConfidence',new THREE.Float32BufferAttribute(confidences,1))
  geometry.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1))
  geometry.setIndex(indices);geometry.computeBoundingSphere()
  return geometry
}

function createCurtainMaterial({upper=false,mobile=false}){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{uTime:{value:0},uHorizontalGain:{value:mobile?MOBILE_HORIZONTAL_GAIN:1.22}},
    vertexShader:`
      precision highp float;
      attribute float aAcross,aEnergy,aConfidence,aPhase;
      varying vec2 vUv;varying float vAcross,vEnergy,vConfidence,vPhase;varying vec3 vWorldPosition,vNormal;
      uniform float uTime,uHorizontalGain;
      void main(){
        vUv=uv;vAcross=aAcross;vEnergy=aEnergy;vConfidence=aConfidence;vPhase=aPhase;
        vec3 radial=normalize(position);vec3 tangent=normalize(vec3(-radial.z,0.,radial.x));
        float fold=sin(uv.x*53.0+aPhase*8.0+uTime*.055)+.42*sin(uv.x*137.0-uTime*.031);
        vec3 displaced=position+tangent*fold*(.0012+.0022*uv.y);
        vec4 world=modelMatrix*vec4(displaced,1.0);vWorldPosition=world.xyz;vNormal=normalize(mat3(modelMatrix)*radial);
        gl_Position=projectionMatrix*viewMatrix*world;gl_Position.x*=uHorizontalGain;
      }`,
    fragmentShader:`
      precision highp float;
      varying vec2 vUv;varying float vAcross,vEnergy,vConfidence,vPhase;varying vec3 vWorldPosition,vNormal;
      uniform float uTime;
      float hash(float n){return fract(sin(n)*43758.5453123);}
      float noise(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(hash(i),hash(i+1.),f);}
      void main(){
        vec3 viewDirection=normalize(cameraPosition-vWorldPosition);
        float edge=pow(1.-abs(dot(vNormal,viewDirection)),.48);
        float rayA=pow(.5+.5*sin(vUv.x*91.0+vPhase*7.0+uTime*.045),2.2);
        float rayB=pow(.5+.5*sin(vUv.x*37.0-vPhase*5.0-uTime*.027),1.7);
        float fine=pow(.5+.5*sin(vUv.x*241.0+vPhase*13.0),4.0);
        float rays=.48+.25*rayA+.20*rayB+.07*fine;
        float broad=.72+.28*noise(vUv.x*19.0+vPhase*5.0+uTime*.006);
        float across=.58+.42*sin(3.14159265*clamp(vAcross,0.,1.));
        float height=${upper?'smoothstep(.03,.24,vUv.y)*(1.-smoothstep(.72,1.,vUv.y))':'smoothstep(.005,.08,vUv.y)*(1.-smoothstep(.78,1.,vUv.y))'};
        float energy=${upper?'smoothstep(.22,.74,vEnergy)':'(.48+.52*smoothstep(.05,.82,vEnergy))'};
        float energyTaper=.82+.18*smoothstep(.12,.70,vEnergy);
        float alpha=edge*rays*broad*across*height*energy*vConfidence*energyTaper*${upper?'.255':'.265'};
        vec3 green=vec3(.10,1.0,.39),cyan=vec3(.08,.86,.72),violet=vec3(.58,.13,.92);
        vec3 color=${upper?'mix(violet,vec3(.96,.18,.64),.18+.18*noise(vUv.x*13.0))':'mix(green,cyan,.18+.38*vUv.y)'};
        if(alpha<.0012)discard;
        gl_FragColor=vec4(color*(1.12+vEnergy*.72),alpha);
      }`,
  })
}

// A very shallow additive bridge between the observed oval and the existing
// atmosphere. It never writes depth and contributes light only in the narrow
// altitude interval that used to expose space between the limb and curtain.
// The approved curtain materials above remain untouched.
function createLimbBridgeMaterial({mobile=false}){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{uTime:{value:0},uHorizontalGain:{value:mobile?MOBILE_HORIZONTAL_GAIN:1.22}},
    vertexShader:`
      precision highp float;
      attribute float aAcross,aEnergy,aConfidence,aPhase;
      varying vec2 vUv;varying float vAcross,vEnergy,vConfidence,vPhase;varying vec3 vWorldPosition,vNormal;
      uniform float uTime,uHorizontalGain;
      void main(){
        vUv=uv;vAcross=aAcross;vEnergy=aEnergy;vConfidence=aConfidence;vPhase=aPhase;
        vec3 radial=normalize(position);vec3 tangent=normalize(vec3(-radial.z,0.,radial.x));
        float fold=sin(uv.x*53.0+aPhase*8.0+uTime*.055)+.42*sin(uv.x*137.0-uTime*.031);
        vec3 displaced=position+tangent*fold*(.0007+.0008*uv.y);
        vec4 world=modelMatrix*vec4(displaced,1.0);vWorldPosition=world.xyz;vNormal=normalize(mat3(modelMatrix)*radial);
        gl_Position=projectionMatrix*viewMatrix*world;gl_Position.x*=uHorizontalGain;
      }`,
    fragmentShader:`
      precision highp float;
      varying vec2 vUv;varying float vAcross,vEnergy,vConfidence,vPhase;varying vec3 vWorldPosition,vNormal;
      uniform float uTime;
      void main(){
        vec3 viewDirection=normalize(cameraPosition-vWorldPosition);
        float limb=pow(1.-abs(dot(vNormal,viewDirection)),.42);
        float across=.62+.38*sin(3.14159265*clamp(vAcross,0.,1.));
        float altitudeFade=1.-smoothstep(.18,1.,vUv.y);
        float lowerContact=smoothstep(.0,.035,vUv.y);
        float energy=.52+.48*smoothstep(.05,.82,vEnergy);
        float pulse=.92+.08*sin(vUv.x*53.0+vPhase*8.0+uTime*.055);
        float alpha=limb*across*altitudeFade*lowerContact*energy*vConfidence*pulse*.115;
        vec3 atmosphereBlue=vec3(.055,.34,.74);
        vec3 auroraGreen=vec3(.10,1.0,.39);
        vec3 color=mix(atmosphereBlue,auroraGreen,smoothstep(.0,.64,vUv.y));
        if(alpha<.001)discard;
        gl_FragColor=vec4(color,alpha);
      }`,
  })
}

export async function createAuroraCinematicCurtainV7(){
  const response=await fetch(EVENT_URL,{cache:'no-store'})
  if(!response.ok)throw new Error(`Aurora V7 event unavailable: ${response.status}`)
  const event=await response.json()
  if(event.registration.manualLongitudeOffsetDeg!==0)throw new Error('Aurora V7 contains forbidden manual registration')
  const mobile=innerWidth<600
  const greenMaterial=createCurtainMaterial({mobile})
  const upperMaterial=createCurtainMaterial({upper:true,mobile})
  const bridgeMaterial=createLimbBridgeMaterial({mobile})
  const green=new THREE.Mesh(buildCurtain(event,{minimumKm:100,maximumKm:360,levels:mobile?20:28,tracks:mobile?6:9,widthGain:1.58}),greenMaterial)
  const upper=new THREE.Mesh(buildCurtain(event,{minimumKm:190,maximumKm:680,levels:mobile?18:24,tracks:mobile?6:9,widthGain:1.50}),upperMaterial)
  const bridge=new THREE.Mesh(buildCurtain(event,{minimumKm:18,maximumKm:132,levels:mobile?10:14,tracks:mobile?6:9,widthGain:1.58}),bridgeMaterial)
  green.renderOrder=9;upper.renderOrder=8;bridge.renderOrder=7
  const pivot=new THREE.Group();pivot.add(bridge,green,upper)
  return {
    pivot,green,upper,bridge,
    setView(rotationY,rotationX=0){pivot.rotation.set(rotationX,rotationY,0)},
    update(time){greenMaterial.uniforms.uTime.value=time;upperMaterial.uniforms.uTime.value=time;bridgeMaterial.uniforms.uTime.value=time},
    state(){return {id:'AURORA_CINEMATIC_CURTAIN_V7',attachedToEarth:true,eventId:event.eventId,sourceMode:event.mode,factSource:event.source.product,expression:'FACT_OVAL_PLUS_CINEMATIC_TRANSLUCENT_CURTAIN_PLUS_ADDITIVE_LIMB_BRIDGE',manualLongitudeOffsetDeg:0,mobileHorizontalGain:mobile?MOBILE_HORIZONTAL_GAIN:1.22,limbBridge:{minimumKm:18,maximumKm:132,depthWrite:false,blending:'additive'}}}
  }
}
