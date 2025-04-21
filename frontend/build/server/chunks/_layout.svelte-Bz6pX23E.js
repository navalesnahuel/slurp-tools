import { C as slot, w as push, E as escape_html, y as pop } from './index-MYp04YD4.js';

function Header($$payload) {
  $$payload.out += `<header class="svelte-197tfn2"><div class="container svelte-197tfn2"><div class="header-content svelte-197tfn2"><a href="/" class="logo-link svelte-197tfn2" aria-label="Slurp Tools Home"><span class="logo-icon svelte-197tfn2" aria-hidden="true">🥤</span> <span class="logo-text svelte-197tfn2">Slurp Tools</span></a> <nav aria-label="Main Navigation" class="svelte-197tfn2"><ul class="svelte-197tfn2"><li class="svelte-197tfn2"><a href="/image-editor" class="svelte-197tfn2">Image Edition</a></li> <li class="svelte-197tfn2"><a href="/scan-to-pdf" class="svelte-197tfn2">Scan Image</a></li> <li class="svelte-197tfn2"><a href="/images-to-pdf" class="svelte-197tfn2">Images to PDF</a></li></ul></nav></div></div></header>`;
}
function Footer($$payload, $$props) {
  push();
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  $$payload.out += `<footer class="site-footer svelte-usi5w6"><div class="container svelte-usi5w6"><div class="footer-grid svelte-usi5w6"><div class="footer-column svelte-usi5w6"><h3 class="svelte-usi5w6">Tools</h3> <ul class="svelte-usi5w6"><li class="svelte-usi5w6"><a href="/image-editor" class="svelte-usi5w6">Image Editor</a></li> <li class="svelte-usi5w6"><a href="/images-to-pdf" class="svelte-usi5w6">Images to PDF</a></li> <li class="svelte-usi5w6"><a href="/scan-to-pdf" class="svelte-usi5w6">Scan Image</a></li></ul></div> <div class="footer-column svelte-usi5w6"><h3 class="svelte-usi5w6"><a href="/" class="svelte-usi5w6">Homepage</a></h3> <ul class="svelte-usi5w6"><li class="svelte-usi5w6"><a href="/image-resize" class="svelte-usi5w6">Image Resize</a></li> <li class="svelte-usi5w6"><a href="/image-crop" class="svelte-usi5w6">Image Crop</a></li> <li class="svelte-usi5w6"><a href="/image-rotate" class="svelte-usi5w6">Image Rotate</a></li></ul></div> <div class="footer-column svelte-usi5w6"><h3 class="svelte-usi5w6">Slurp Tools</h3> <p class="description svelte-usi5w6">Fast, bloat-free tools designed to tackle common image and document tasks
					quickly.</p> <p class="copyright svelte-usi5w6">© ${escape_html(currentYear)} Slurp Tools. All rights reserved.</p></div></div></div></footer>`;
  pop();
}
function _layout($$payload, $$props) {
  $$payload.out += `<div class="app-container svelte-czgx5h">`;
  Header($$payload);
  $$payload.out += `<!----> <main class="svelte-czgx5h"><!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!----></main> `;
  Footer($$payload);
  $$payload.out += `<!----></div>`;
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-Bz6pX23E.js.map
