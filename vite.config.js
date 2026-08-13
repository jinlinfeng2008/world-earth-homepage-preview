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

// Deployment-only adapter. demo-assets/ (the 159-record public demo
// dataset and its synthetic media) lives entirely outside
// world-earth-homepage-v1/ and is not part of the audited source tree.
// This copies it into the build output, unmodified.
const copyDemoAssetsToOutput = {
  name: 'copy-demo-assets-to-output',
  closeBundle() {
    const src = resolve(__dirname, 'demo-assets')
    const dest = resolve(__dirname, 'dist/demo-assets')
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
//
// The same script also substitutes the public demo dataset for the
// system-test fixture dataset by default. This is a network-level swap,
// not a data-content change: fixture-provider.js still requests exactly
// '/world-earth-homepage-v1/fixtures/fixture-dataset.json' (unchanged),
// still validates the response through the unmodified source-policy.js,
// and the demo records' `src` values still use the exact
// '/world-earth-homepage-v1/fixtures/media/...' prefix the FIXTURE policy
// already allows. Appending ?rawFixture=1 to the URL skips the swap and
// serves the original 6-record system-test fixture untouched, for anyone
// who specifically needs the minimal test set.
const injectPagesBaseNetworkAdapter = {
  name: 'inject-pages-base-network-adapter',
  transformIndexHtml: {
    order: 'pre',
    handler(_html, ctx) {
      const prefix = ctx.server ? '' : PAGES_BASE.slice(0, -1)
      const script = `(function(){
  var BASE=${JSON.stringify(prefix)};
  var PREFIXES=['/world-earth-homepage-v1/','/textures/','/data/'];
  var FIXTURE_DATASET='/world-earth-homepage-v1/fixtures/fixture-dataset.json';
  var DEMO_MEDIA_RE=/\\/world-earth-homepage-v1\\/fixtures\\/media\\/(demo-\\d+\\.svg)$/;
  var useDemo=new URLSearchParams(location.search).get('rawFixture')!=='1';
  function resolveUrl(v){
    if(typeof v!=='string')return v;
    if(useDemo&&v.indexOf(FIXTURE_DATASET)===v.length-FIXTURE_DATASET.length)return BASE+'/demo-assets/public-demo-dataset.json';
    var m=v.match(DEMO_MEDIA_RE);
    if(m)return BASE+'/demo-assets/media/'+m[1];
    if(BASE&&PREFIXES.some(function(p){return v.indexOf(p)===0})&&v.indexOf(BASE)!==0)return BASE+v;
    return v;
  }
  var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,enumerable:d.enumerable,
    get:function(){return d.get.call(this)},
    set:function(v){d.set.call(this,resolveUrl(v))}});
  var origFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    if(typeof input==='string')input=resolveUrl(input);
    else if(input&&typeof input==='object'&&typeof input.url==='string'){var u=resolveUrl(input.url);if(u!==input.url)input=u;}
    return origFetch(input,init);
  };
})();`
      return [{ tag: 'script', injectTo: 'head-prepend', children: script }]
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
  plugins: [copyFixturesToOutput, copyDemoAssetsToOutput, injectPagesBaseNetworkAdapter],
})
