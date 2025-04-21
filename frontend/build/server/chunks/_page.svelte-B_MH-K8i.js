import { w as push, Q as head, y as pop, E as escape_html, K as attr, N as attr_style, R as store_get, S as unsubscribe_stores } from './index-MYp04YD4.js';
import { t as tick, o as onDestroy } from './index-server-rOK-Pkpj.js';
import { i as imageEditorStore, I as ImageEditorLayout } from './ImageEditorLayout-C7QIeH82.js';
import { F as FileManagementSidebar, H as HistoryControlsSidebar, D as DownloadSidebar } from './DownloadSidebar-Dg8ykSer.js';
import './index2-CMxvAIQo.js';

function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let isValidInput, canApplyResize, displayError;
  const MAX_DIMENSION = 5e3;
  let targetWidth = "";
  let targetHeight = "";
  let keepAspectRatio = true;
  let imageUUID, imageUrl, isLoading, isApplying, originalDimensions, storeErrorMessage;
  const unsubscribeStore = imageEditorStore.subscribe((state) => {
    imageUUID = state.imageUUID;
    imageUrl = state.imageUrl;
    isLoading = state.isLoading;
    isApplying = state.isApplying;
    storeErrorMessage = state.errorMessage;
    if (originalDimensions !== state.originalDimensions) {
      originalDimensions = state.originalDimensions;
      if (originalDimensions) {
        initializeTargetDimensions(originalDimensions.width, originalDimensions.height);
      } else {
        targetWidth = "";
        targetHeight = "";
      }
    }
  });
  function initializeTargetDimensions(origW, origH) {
    if (!origW || !origH) return;
    let w = Math.max(1, Math.min(origW, MAX_DIMENSION));
    let h = Math.max(1, Math.min(origH, MAX_DIMENSION));
    const ratio = origW / origH;
    if (origW > MAX_DIMENSION || origH > MAX_DIMENSION) {
      if (w > h) {
        w = MAX_DIMENSION;
        h = Math.max(1, Math.round(w / ratio));
        h = Math.min(h, MAX_DIMENSION);
      } else {
        h = MAX_DIMENSION;
        w = Math.max(1, Math.round(h * ratio));
        w = Math.min(w, MAX_DIMENSION);
      }
    }
    targetWidth = w;
    targetHeight = h;
    tick().then(() => false);
  }
  onDestroy(() => {
    unsubscribeStore();
    imageEditorStore.cleanupBlobUrl();
  });
  isValidInput = typeof targetWidth === "number" && targetWidth > 0 && targetWidth <= MAX_DIMENSION && typeof targetHeight === "number" && targetHeight > 0 && targetHeight <= MAX_DIMENSION;
  canApplyResize = !!imageUUID && !!originalDimensions && !isLoading && !isApplying && isValidInput;
  displayError = storeErrorMessage;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Image Resizer - Slurp Tools</title>`;
  });
  ImageEditorLayout($$payload, {
    toolTitle: "Image Resizer",
    toolDescription: "Select an image to resize it.",
    $$slots: {
      "toolbar-left": ($$payload2) => {
        $$payload2.out += `<div slot="toolbar-left" class="svelte-1q20jju"><span class="toolbar-label svelte-1q20jju">Resizer</span></div>`;
      },
      "toolbar-right": ($$payload2) => {
        $$payload2.out += `<div slot="toolbar-right" class="svelte-1q20jju"><button class="apply-button button-like toolbar-button svelte-1q20jju"${attr("disabled", !canApplyResize, true)}${attr("title", canApplyResize ? "Apply new dimensions" : "Enter valid dimensions below")}>`;
        if (isApplying) {
          $$payload2.out += "<!--[-->";
          $$payload2.out += `<span class="button-spinner svelte-1q20jju"></span> Applying...`;
        } else {
          $$payload2.out += "<!--[!-->";
          $$payload2.out += `Apply Resize`;
        }
        $$payload2.out += `<!--]--></button></div>`;
      },
      "main-content": ($$payload2) => {
        $$payload2.out += `<div slot="main-content" class="resize-main-content svelte-1q20jju">`;
        if (imageUrl) {
          $$payload2.out += "<!--[-->";
          $$payload2.out += `<div class="img-container svelte-1q20jju"><img${attr("src", imageUrl)}${attr("alt", store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore).originalFilename || "Image to resize")}${attr("key", imageUrl)} class="preview-image svelte-1q20jju"${attr_style("", { opacity: isLoading ? 0.5 : 1 })}></div>`;
        } else if (!isLoading) {
          $$payload2.out += "<!--[1-->";
          $$payload2.out += `<p class="placeholder-text svelte-1q20jju">Select an image to start.</p>`;
        } else {
          $$payload2.out += "<!--[!-->";
        }
        $$payload2.out += `<!--]--></div>`;
      },
      "sidebar-content": ($$payload2, { openFilePicker }) => {
        {
          FileManagementSidebar($$payload2, {});
          $$payload2.out += `<!----> <div class="sidebar-section section-resize svelte-1q20jju"><h4 class="h4-pink svelte-1q20jju">Resize Dimensions</h4> `;
          if (originalDimensions) {
            $$payload2.out += "<!--[-->";
            $$payload2.out += `<p class="original-dims-info svelte-1q20jju">Current: ${escape_html(originalDimensions.width)} x ${escape_html(originalDimensions.height)} px</p> <div class="dimension-inputs svelte-1q20jju"><div class="input-group svelte-1q20jju"><label for="width" class="svelte-1q20jju">Width (px)</label> <input type="number" id="width"${attr("value", targetWidth)} min="1"${attr("max", MAX_DIMENSION)}${attr("disabled", isLoading || isApplying || !originalDimensions, true)} placeholder="Width" class="svelte-1q20jju"></div> <div class="input-group svelte-1q20jju"><label for="height" class="svelte-1q20jju">Height (px)</label> <input type="number" id="height"${attr("value", targetHeight)} min="1"${attr("max", MAX_DIMENSION)}${attr("disabled", isLoading || isApplying || !originalDimensions, true)} placeholder="Height" class="svelte-1q20jju"></div></div> <div class="aspect-toggle svelte-1q20jju"><label title="Maintain aspect ratio when changing dimensions" class="svelte-1q20jju"><input type="checkbox"${attr("checked", keepAspectRatio, true)}${attr("disabled", isLoading || isApplying || !originalDimensions, true)} class="svelte-1q20jju"> <span class="svelte-1q20jju">Lock aspect ratio</span></label></div>`;
          } else if (imageUUID && isLoading) {
            $$payload2.out += "<!--[1-->";
            $$payload2.out += `<p class="placeholder-text svelte-1q20jju">Loading dimensions...</p>`;
          } else {
            $$payload2.out += "<!--[!-->";
            $$payload2.out += `<p class="placeholder-text svelte-1q20jju">Load an image to see dimensions.</p>`;
          }
          $$payload2.out += `<!--]--></div> `;
          HistoryControlsSidebar($$payload2, {});
          $$payload2.out += `<!----> `;
          DownloadSidebar($$payload2);
          $$payload2.out += `<!----> `;
          if (displayError) {
            $$payload2.out += "<!--[-->";
            $$payload2.out += `<div class="sidebar-error-container svelte-1q20jju"><p class="error-message sidebar-error svelte-1q20jju">${escape_html(displayError)}</p></div>`;
          } else {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]-->`;
        }
      }
    }
  });
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-B_MH-K8i.js.map
