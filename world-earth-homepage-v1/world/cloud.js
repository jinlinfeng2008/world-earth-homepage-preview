import * as THREE from 'three'

const CLOUD_SOURCE = '/textures/earth-clouds-4k.png'
const LOW_RADIUS = 1.0024
const MID_RADIUS = 1.0068
const HIGH_RADIUS = 1.0118
const BASE_DRIFT_RATE = .0032

function cloudMaterial({ texture, layer, sunDir }) {
  const high = layer === 'high'
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uCloud: { value: texture },
      uSun: { value: sunDir.clone() },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalW;
      void main(){vUv=uv;vNormalW=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader: `
      precision highp float;
      uniform sampler2D uCloud;
      uniform vec3 uSun;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalW;
      void main(){
        float latitude=abs(vUv.y-.5)*2.0;
        float bandWind=mix(1.18,.52,smoothstep(.05,.92,latitude));
        float direction=mix(1.0,-.34,smoothstep(.58,.95,latitude));
        float inferredFlow=uTime*${high ? '.000030' : '.000014'}*bandWind*direction;
        vec2 uv=vec2(fract(vUv.x+inferredFlow),vUv.y);
        vec4 sample0=texture2D(uCloud,uv);
        vec4 sample1=texture2D(uCloud,vec2(fract(uv.x+${high ? '.0065' : '.0022'}),uv.y));
        // The observed composite is an opaque RGB image. Alpha is not cloud
        // density; using it would turn the whole globe into one grey veil.
        // The PNG carries observed cloud density in alpha; RGB is only a
        // display matte and must never participate in the density contract.
        float density=sample0.a;
        float neighbor=sample1.a;
        float thin=smoothstep(.16,.58,density)*(1.0-smoothstep(.68,.94,density));
        float body=smoothstep(.50,.92,density);
        float structure=${high ? 'thin*.78+body*.12' : 'thin*.24+body*.86'};
        float ndl=clamp(dot(normalize(vNormalW),normalize(uSun))*.5+.5,0.0,1.0);
        float edge=clamp((density-neighbor)*3.2+.5,0.0,1.0);
        vec3 shadowColor=vec3(.30,.36,.43);
        vec3 lightColor=vec3(.82,.87,.93);
        float orbitalFill=.13+ndl*.66+edge*.17;
        vec3 color=mix(shadowColor,lightColor,orbitalFill);
        float alpha=structure*${high ? '.14' : '.40'};
        if(alpha<.008)discard;
        gl_FragColor=vec4(color,alpha);
      }
    `,
  })
}

function shadowMaterial(texture) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    uniforms: { uCloud: { value: texture } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `precision highp float;uniform sampler2D uCloud;varying vec2 vUv;void main(){vec4 s=texture2D(uCloud,vUv+vec2(.0026,-.0015));float d=s.a;float a=smoothstep(.44,.90,d)*.095;if(a<.006)discard;gl_FragColor=vec4(vec3(0.0),a);}`,
  })
}

export function createCloudObservationV2({ renderer, sunDir }) {
  const texture = new THREE.TextureLoader().load(CLOUD_SOURCE)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
  const pivot = new THREE.Group()
  const shadow = new THREE.Mesh(new THREE.SphereGeometry(LOW_RADIUS, 192, 144), shadowMaterial(texture))
  const midMaterial = cloudMaterial({ texture, layer: 'mid', sunDir })
  const highMaterial = cloudMaterial({ texture, layer: 'high', sunDir })
  const mid = new THREE.Mesh(new THREE.SphereGeometry(MID_RADIUS, 192, 144), midMaterial)
  const high = new THREE.Mesh(new THREE.SphereGeometry(HIGH_RADIUS, 192, 144), highMaterial)
  shadow.renderOrder = 6
  mid.renderOrder = 7
  high.renderOrder = 8
  pivot.add(shadow, mid, high)
  let baseRotation = 0
  let baseTilt = 0
  return {
    pivot,
    mesh: mid,
    shadow,
    texture,
    driftRate: BASE_DRIFT_RATE,
    setView(rotationY, rotationX = 0) {
      baseRotation = rotationY
      baseTilt = rotationX
      pivot.rotation.set(baseTilt, baseRotation, 0)
    },
    spin(time) {
      pivot.rotation.set(baseTilt, baseRotation + time * BASE_DRIFT_RATE, 0)
      midMaterial.uniforms.uTime.value = time
      highMaterial.uniforms.uTime.value = time
    },
    state() {
      return {
        id: 'CLOUD_OBSERVATION_V2',
        source: CLOUD_SOURCE,
        sourceClass: 'HISTORICAL_OBSERVED_COMPOSITE',
        evolutionClass: 'INFERENCE_BANDED_ADVECTION',
        liveWeather: false,
        shellRadii: [LOW_RADIUS, MID_RADIUS, HIGH_RADIUS],
        layers: ['shadow', 'mid-low', 'high-thin'],
        driftRate: BASE_DRIFT_RATE,
      }
    },
  }
}
