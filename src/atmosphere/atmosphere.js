import * as THREE from 'three'

const EARTH_RADIUS_KM = 6371
const ATMOSPHERE_TOP_KM = 100
// The physical density model remains 0-100 km. At orbital first-screen scale
// its sub-pixel thickness is presentation-expanded so the real gradient is
// perceptible on a 390 px display. This changes geometry only, not physics.
const PRESENTATION_ALTITUDE_SCALE = 2.65

function createScatterMaterial({ altitudeKm, weight, sunDir, cameraPosition }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uSun: { value: sunDir.clone() },
      uCamera: { value: cameraPosition.clone() },
      uAltitudeKm: { value: altitudeKm },
      uLayerT: { value: altitudeKm / ATMOSPHERE_TOP_KM },
      uWeight: { value: weight },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main(){
        vec4 world=modelMatrix*vec4(position,1.0);
        vWorldPosition=world.xyz;
        vWorldNormal=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*viewMatrix*world;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uSun,uCamera;
      uniform float uAltitudeKm,uLayerT,uWeight;
      varying vec3 vWorldPosition,vWorldNormal;
      void main(){
        vec3 N=normalize(vWorldNormal);
        vec3 V=normalize(uCamera-vWorldPosition);
        float mu=clamp(dot(N,V),0.0,1.0);
        float ndl=dot(N,normalize(uSun));
        float rayleighDensity=exp(-uAltitudeKm/8.5);
        float mieDensity=exp(-uAltitudeKm/1.2);
        float ozone=exp(-pow((uAltitudeKm-25.0)/13.0,2.0));
        float tangentPath=1.0/sqrt(max(.018,mu*mu+.012));
        float limb=pow(1.0-mu,2.15);
        float day=smoothstep(-.16,.24,ndl);
        float terminator=exp(-pow(ndl/.18,2.0));
        float night=.11+.14*terminator;
        vec3 lowSky=vec3(.07,.31,.94);
        vec3 highSky=vec3(.18,.72,1.0);
        vec3 betaRayleigh=mix(lowSky,highSky,smoothstep(.18,.92,uLayerT));
        vec3 betaMie=vec3(.95,.91,.82);
        vec3 betaOzone=vec3(.18,.28,.06);
        vec3 color=betaRayleigh*(.62+rayleighDensity*.38)+betaMie*mieDensity*.16;
        color=mix(color,color*vec3(.86,.90,.72),ozone*.15);
        float altitudeEnvelope=mix(1.0,.62,smoothstep(.58,1.0,uLayerT));
        float alpha=limb*tangentPath*uWeight*altitudeEnvelope*(mix(night,1.0,day)+terminator*.34);
        alpha*=1.0-exp(-alpha*1.82);
        if(alpha<.0012)discard;
        gl_FragColor=vec4(color,alpha);
      }
    `,
  })
}

export function createAtmospherePhysicalV2({ sunDir, cameraPosition }) {
  const layers = [
    { altitudeKm: 12, weight: .055 },
    { altitudeKm: 35, weight: .071 },
    { altitudeKm: 72, weight: .062 },
    { altitudeKm: 100, weight: .046 },
  ]
  const pivot = new THREE.Group()
  const meshes = layers.map(({ altitudeKm, weight }, index) => {
    const radius = 1 + altitudeKm * PRESENTATION_ALTITUDE_SCALE / EARTH_RADIUS_KM
    const material = createScatterMaterial({ altitudeKm, weight, sunDir, cameraPosition })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 160, 120), material)
    mesh.renderOrder = 18 + index
    pivot.add(mesh)
    return mesh
  })
  return {
    pivot,
    meshes,
    setCam(value) { for (const mesh of meshes) mesh.material.uniforms.uCamera.value.copy(value) },
    setSun(value) { for (const mesh of meshes) mesh.material.uniforms.uSun.value.copy(value) },
    setView(rotationY, rotationX = 0) { pivot.rotation.set(rotationX, rotationY, 0) },
    state() {
      return {
        id: 'ATMOSPHERE_PHYSICAL_V2',
        class: 'PHYSICS_BOUNDED_SINGLE_SCATTERING',
        earthRadiusKm: EARTH_RADIUS_KM,
        atmosphereTopKm: ATMOSPHERE_TOP_KM,
        presentationAltitudeScale: PRESENTATION_ALTITUDE_SCALE,
        presentationClass: 'ART_PERCEPTUAL_SCALE_ONLY',
        layersKm: layers.map(layer => layer.altitudeKm),
        rayleighScaleHeightKm: 8.5,
        mieScaleHeightKm: 1.2,
        ozoneCenterKm: 25,
      }
    },
  }
}
