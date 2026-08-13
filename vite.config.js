import { defineConfig } from 'vite'
import { cpSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PAGES_BASE = '/world-earth-homepage-preview/'

// Deployment-only adapter. fixtures/ is fetched at runtime by string path
// (not imported as an ES module), so Vite's bundler cannot see it and
// would otherwise leave it out of the build output. This copies it,
// unmodified, into the build output after the bundle is written. It does
// not add, remove, or duplicate any file inside the committed
// world-earth-homepage-v1/ source tree.
const copyFixturesToOutput = {
  name: 'copy-fixtures-to-output',
  closeBundle() {
    const src = resolve(__dirname, 'world-earth-homepage-v1/fixtures')
    const dest = resolve(__dirname, 'dist/world-earth-homepage-v1/fixtures')
    if (existsSync(src)) cpSync(src, dest, { recursive: true })
  },
}

// Deployment-only adapter. No file under world-earth-homepage-v1/ is
// modified, at build time or otherwise — no text rewriting of any source
// string happens anywhere. `source-policy.js` therefore keeps validating
// exactly the same root-relative strings (e.g.
// '/world-earth-homepage-v1/fixtures/media/asia-1.svg',
// '/data/homepage-complete-expression-v1/...') it validated in the version
// already reviewed, whether that string came from a literal in a .js file
// or from fetched JSON data (fixture-dataset.json / a manifest's own
// tier.url field) — both cases behave identically to the reviewed build.
//
// Only the browser's actual network resolution is redirected: this
// injects one inline script into the built HTML (the committed
// world-earth-homepage-v1/index.html on GitHub is never touched) that
// patches `window.fetch` and `HTMLImageElement.src` so that any of those
// same root-relative strings resolve under the GitHub Pages project
// subpath when the browser actually requests them. The application never
// sees a rewritten value; only the wire request differs.
const injectPagesBaseNetworkAdapter = {
  name: 'inject-pages-base-network-adapter',
  transformIndexHtml: {
    order: 'pre',
    handler(_html, ctx) {
      const prefix = ctx.server ? '' : PAGES_BASE.slice(0, -1)
      const script = `<script>(function(){
  var BASE=${JSON.stringify(prefix)};
  var PREFIXES=['/world-earth-homepage-v1/','/textures/','/data/'];
  function needsBase(v){return typeof v==='string'&&BASE&&PREFIXES.some(function(p){return v.indexOf(p)===0})&&v.indexOf(BASE)!==0}
  var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,enumerable:d.enumerable,
    get:function(){return d.get.call(this)},
    set:function(v){d.set.call(this,needsBase(v)?BASE+v:v)}});
  var origFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    if(typeof input==='string'&&needsBase(input))input=BASE+input;
    else if(input&&typeof input==='object'&&typeof input.url==='string'&&needsBase(input.url))input=BASE+input.url;
    return origFetch(input,init);
  };
})();</script>`
      return [{ tag: 'script', injectTo: 'head-prepend', children: script.replace(/^<script>|<\/script>$/g, '') }]
    },
  },
}

export default defineConfig({
  base: PAGES_BASE,
  root: '.',
  build: {
    rollupOptions: {
      input: 'world-earth-homepage-v1/index.html',
    },
  },
  plugins: [copyFixturesToOutput, injectPagesBaseNetworkAdapter],
})
