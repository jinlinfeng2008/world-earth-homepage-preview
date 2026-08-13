import * as THREE from 'three'

// Global night-light optical pass. The runtime consumes one geographically
// continuous radiance product and never uses city lists, population fields,
// point clouds, or per-country exposure. The current 10K source is the EOG
// Artist PNG. Runtime keeps the physical-radiance decode separate from the EOG
// Artist display response: facts determine where energy exists; the published
// sqrt response determines how dim urban fabric survives orbital viewing.
// A formal linear GeoTIFF-derived texture can replace the proxy without changing
// this render contract.
export function createHomepageGlobalCityLights({renderer,radianceTexture,radianceDimensions,radianceDecodeMode=0,radianceMax=75,nasaTexture,nasaDimensions,gripTexture,factNetworkTexture,cloudTexture,width,height,quality='mid'}){
  const profile=quality==='high'
    ?{scale:1,wide:1}
    :quality==='low'?{scale:.68,wide:0}:{scale:1,wide:.22}
  const scene=new THREE.Scene();scene.background=new THREE.Color(0)
  const group=new THREE.Group();scene.add(group)
  const texel=new THREE.Vector2(1/radianceDimensions[0],1/radianceDimensions[1])
  const emissionMaterial=new THREE.ShaderMaterial({
    depthWrite:true,depthTest:true,blending:THREE.NoBlending,
    uniforms:{radianceTex:{value:radianceTexture},nasaTex:{value:nasaTexture},gripTex:{value:gripTexture},factNetworkTex:{value:factNetworkTexture},cloudTex:{value:cloudTexture},uTexel:{value:texel},uExposure:{value:1.12},uCloudOffset:{value:0},uDecodeMode:{value:radianceDecodeMode},uRadianceMax:{value:radianceMax},uLod:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D radianceTex,nasaTex,gripTex,factNetworkTex,cloudTex;uniform vec2 uTexel;uniform float uExposure,uCloudOffset,uDecodeMode,uRadianceMax,uLod;
      float gray(sampler2D map,vec2 p,float bias){return dot(texture2D(map,p,bias).rgb,vec3(.2126,.7152,.0722));}
      float encoded(vec2 p){vec4 sampleValue=texture2D(radianceTex,p,-1.55);return uDecodeMode>.5?sampleValue.r:dot(sampleValue.rgb,vec3(.2126,.7152,.0722));}
      float radiance(vec2 p){float e=encoded(p);return uDecodeMode>.5?e*uRadianceMax:e*e*uRadianceMax;}
      float artistResponse(vec2 p){return sqrt(clamp(radiance(p)/max(uRadianceMax,.0001),0.,1.));}
      void main(){
        vec2 t=uTexel;
        float eog=artistResponse(vUv);
        float nasa=gray(nasaTex,vUv,-1.35);
        float grip=gray(gripTex,vUv,-.35);
        float observed=max(nasa,eog*.70);
        float agreement=sqrt(max(nasa*eog,0.));
        float raw=mix(observed,agreement,.42);
        float near=(raw*4.
          +artistResponse(vUv+vec2(t.x*1.4,0.))+artistResponse(vUv-vec2(t.x*1.4,0.))
          +artistResponse(vUv+vec2(0.,t.y*1.4))+artistResponse(vUv-vec2(0.,t.y*1.4)))/8.;
        float fabric=(near*4.
          +artistResponse(vUv+vec2(t.x*3.8,0.))+artistResponse(vUv-vec2(t.x*3.8,0.))
          +artistResponse(vUv+vec2(0.,t.y*3.8))+artistResponse(vUv-vec2(0.,t.y*3.8)))/8.;
        float support=smoothstep(.006,.045,max(observed,fabric));
        if(support<.001)discard;
        float structure=clamp(gray(factNetworkTex,vUv,-.85)*pow(grip,.82)*2.2,0.,1.)*support;
        // Preserve the observed low-frequency city footprint, but keep most
        // energy in the mid-frequency fabric. The former .18 subtraction made
        // almost the whole smoothed radiance field a bright network.
        float cityFabric=pow(eog,.82)*support*(1.-structure*.34);
        float observedMid=pow(clamp((near-fabric*.82)*3.0,0.,1.),.92);
        float network=(pow(eog,1.08)*.42+observedMid*.46+pow(structure,1.08)*mix(.25,.48,1.-uLod))*support;
        float node=pow(clamp((raw-near*.91)*2.4,0.,1.),.88)*support;
        float core=pow(raw,5.2)*smoothstep(.52,.94,raw);
        // Spectral hierarchy calibrated between the EOG amber reference and
        // the former cream-white product render. Most visible energy stays in
        // warm gold; only the strongest real radiance peaks approach warm white.
        vec3 darkGold=vec3(.255,.170,.055),gold=vec3(1.00,.650,.245),warmWhite=vec3(1.18,.970,.700);
        vec3 c=darkGold*cityFabric*.25
          +gold*network*.52
          +mix(gold,warmWhite,smoothstep(.48,.88,raw))*node*.34
          +warmWhite*core*.20;
        // City emission is composited after the cloud shell, so attenuation is
        // applied here to keep observed lights physically behind cloud mass.
        float cloud=texture2D(cloudTex,vec2(fract(vUv.x-uCloudOffset),vUv.y)).a;
        float cloudTransmission=mix(1.,.24,smoothstep(.20,.84,cloud));
        gl_FragColor=vec4(c*uExposure*cloudTransmission,1.);
      }`,
  })
  group.add(new THREE.Mesh(new THREE.SphereGeometry(1.004,256,192),emissionMaterial))

  let rw=1,rh=1
  const rt=(w,h,depth=false)=>new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:depth,stencilBuffer:false})
  const emissionRT=rt(1,1,true),brightNarrow=rt(1,1),brightMedium=rt(1,1),brightWide=rt(1,1)
  const narrow=[rt(1,1),rt(1,1)],medium=[rt(1,1),rt(1,1)],wide=[rt(1,1),rt(1,1)]
  const quadScene=new THREE.Scene(),quadCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1)
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));quadScene.add(quad)
  const pass=(material,target,clear=true)=>{quad.material=material;renderer.setRenderTarget(target);if(clear)renderer.clear();renderer.render(quadScene,quadCamera)}
  const brightMaterial=new THREE.ShaderMaterial({
    uniforms:{map:{value:emissionRT.texture},threshold:{value:1}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
    fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D map;uniform float threshold;void main(){vec3 c=texture2D(map,vUv).rgb;float l=max(c.r,max(c.g,c.b));float k=smoothstep(threshold,threshold*1.35,l);gl_FragColor=vec4(c*k,1.);}`,
  })
  const blurMaterial=new THREE.ShaderMaterial({
    uniforms:{map:{value:null},direction:{value:new THREE.Vector2()},texel:{value:new THREE.Vector2()}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
    fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D map;uniform vec2 direction,texel;void main(){vec2 d=direction*texel;vec3 c=texture2D(map,vUv).rgb*.227027;c+=(texture2D(map,vUv+d*1.384615).rgb+texture2D(map,vUv-d*1.384615).rgb)*.316216;c+=(texture2D(map,vUv+d*3.230769).rgb+texture2D(map,vUv-d*3.230769).rgb)*.070270;gl_FragColor=vec4(c,1.);}`,
  })
  const overlayMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{emission:{value:emissionRT.texture},narrow:{value:null},medium:{value:null},wide:{value:null},wideGain:{value:profile.wide}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
    fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D emission,narrow,medium,wide;uniform float wideGain;
      vec3 filmic(vec3 x){return (x*(2.51*x+.03))/(x*(2.43*x+.59)+.14);}
      void main(){vec3 e=texture2D(emission,vUv).rgb;vec3 n=texture2D(narrow,vUv).rgb;vec3 m=texture2D(medium,vUv).rgb;vec3 w=texture2D(wide,vUv).rgb;vec3 c=e*1.02+n*.050+m*.012+w*.0004*wideGain;gl_FragColor=vec4(clamp(filmic(c),0.,1.),1.);
        #include <colorspace_fragment>
      }`,
  })
  function bright(threshold,target){brightMaterial.uniforms.threshold.value=threshold;pass(brightMaterial,target);return target.texture}
  function blur(input,pair,iterations){let source=input;for(let i=0;i<iterations;i++){blurMaterial.uniforms.map.value=source;blurMaterial.uniforms.texel.value.set(1/pair[0].width,1/pair[0].height);blurMaterial.uniforms.direction.value.set(1,0);pass(blurMaterial,pair[0]);blurMaterial.uniforms.map.value=pair[0].texture;blurMaterial.uniforms.direction.value.set(0,1);pass(blurMaterial,pair[1]);source=pair[1].texture}return source}
  function resize(nextWidth,nextHeight){
    rw=Math.max(1,Math.round(nextWidth*profile.scale));rh=Math.max(1,Math.round(nextHeight*profile.scale))
    emissionRT.setSize(rw,rh);brightNarrow.setSize(rw,rh);brightMedium.setSize(rw,rh);brightWide.setSize(rw,rh)
    for(const target of narrow)target.setSize(Math.ceil(rw/2),Math.ceil(rh/2))
    for(const target of medium)target.setSize(Math.ceil(rw/4),Math.ceil(rh/4))
    for(const target of wide)target.setSize(Math.ceil(rw/8),Math.ceil(rh/8))
  }
  resize(width,height)
  function render(camera){
    const oldAutoClear=renderer.autoClear
    renderer.setRenderTarget(emissionRT);renderer.autoClear=true;renderer.clear();renderer.render(scene,camera)
    const n=blur(bright(.62,brightNarrow),narrow,1)
    const m=blur(bright(1.20,brightMedium),medium,2)
    const w=profile.wide?blur(bright(1.85,brightWide),wide,2):brightWide.texture
    overlayMaterial.uniforms.narrow.value=n;overlayMaterial.uniforms.medium.value=m;overlayMaterial.uniforms.wide.value=w
    renderer.setRenderTarget(null);renderer.autoClear=false;pass(overlayMaterial,null,false);renderer.autoClear=oldAutoClear
  }
  return {
    render,resize,
    setView(rotationY,y,rotationX=0){group.rotation.set(rotationX,rotationY,0);group.position.y=y},
    setCameraDistance(distance){emissionMaterial.uniforms.uLod.value=THREE.MathUtils.clamp((distance-3.2)/4.8,0,1)},
    setCloudOffset(turns){emissionMaterial.uniforms.uCloudOffset.value=turns},
    stats:()=>({quality,calibrationStatus:radianceDecodeMode?'FORMAL_LINEAR_RADIANCE_EOG_ARTIST_RESPONSE':'VISUAL_PROXY_NASA_EOG_GRIP_GHSL_WSF_PENDING',renderSize:[rw,rh],sourceDimensions:{eog:[...radianceDimensions],nasa:[...nasaDimensions],grip:[4320,2160],factNetwork:[5400,2700]},sourceProduct:'NASA Black Marble 2016 display proxy + EOG VNL 2020 Artist proxy + GRIP4',sourceMapping:radianceDecodeMode?`FACT radiance=normalizedU16*${radianceMax}; ART response=sqrt(radiance/range)`:`NASA/EOG display proxies cross-support light; GRIP and fact-derived network shape only supported pixels`,builtUpContract:{ghsl:false,wsf:false,status:'PENDING_FORMAL_BUILTUP_INPUTS'},pointSources:0,pointVboBytes:0,globalExposure:true,regionalGain:false,passes:{earthBase:false,emission:true,narrow:true,medium:true,wide:profile.wide>0}}),
  }
}
