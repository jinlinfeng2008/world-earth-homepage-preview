import { defineConfig } from 'vite'
import { cpSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Deployment-only adapter. It does not touch any file under
// world-earth-homepage-v1/ on disk. It rewrites, at build time only,
// root-relative asset path string literals (e.g. '/textures/...',
// '/data/...', '/world-earth-homepage-v1/...') so they resolve correctly
// under the GitHub Pages project subpath. The source files committed to
// travel-earth-engine remain byte-identical; only the built output differs.
const rootRelativePathRewrite = {
  name: 'root-relative-path-rewrite-for-pages-base',
  transform(code, id) {
    if (!id.includes('/world-earth-homepage-v1/')) return null
    if (!/['"`]\/(textures|data|world-earth-homepage-v1)\//.test(code)) return null
    const base = this.environment?.config?.base ?? '/world-earth-homepage-preview/'
    const prefix = base.endsWith('/') ? base.slice(0, -1) : base
    const rewritten = code.replace(
      /(['"`])\/(textures|data|world-earth-homepage-v1)\//g,
      (_match, quote, dir) => `${quote}${prefix}/${dir}/`,
    )
    return { code: rewritten, map: null }
  },
}

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

// Deployment-only adapter. Photo `src` values for fixture/Founder records
// arrive as runtime DATA (fetched JSON), not as string literals in any .js
// file, so the build-time text transform above cannot reach them — and
// source-policy.js must keep validating the original, un-prefixed string
// (e.g. '/world-earth-homepage-v1/fixtures/media/asia-1.svg') or its
// allow-list check would reject every record. This injects one small
// inline script into the built HTML only (the committed index.html on
// GitHub is never touched) that intercepts `HTMLImageElement.src` writes
// and prepends the Pages base solely for network resolution, leaving the
// application's own string values — and therefore its validation — the
// same as the version already reviewed.
const injectImageSrcBaseAdapter = {
  name: 'inject-image-src-base-adapter',
  transformIndexHtml: {
    order: 'pre',
    handler(html, ctx) {
      const base = ctx.server ? '/' : '/world-earth-homepage-preview/'
      const prefix = base.endsWith('/') ? base.slice(0, -1) : base
      const script = `<script>(function(){
  var BASE=${JSON.stringify(prefix)};
  var PREFIXES=['/world-earth-homepage-v1/','/textures/','/data/'];
  var desc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,enumerable:desc.enumerable,
    get:function(){return desc.get.call(this)},
    set:function(v){
      if(typeof v==='string'&&BASE&&PREFIXES.some(function(p){return v.indexOf(p)===0})&&v.indexOf(BASE)!==0){v=BASE+v}
      desc.set.call(this,v);
    }});
})();</script>`
      return html.replace('<head>', `<head>\n    ${script}`)
    },
  },
}

export default defineConfig({
  base: '/world-earth-homepage-preview/',
  root: '.',
  build: {
    rollupOptions: {
      input: 'world-earth-homepage-v1/index.html',
    },
  },
  plugins: [rootRelativePathRewrite, copyFixturesToOutput, injectImageSrcBaseAdapter],
})
