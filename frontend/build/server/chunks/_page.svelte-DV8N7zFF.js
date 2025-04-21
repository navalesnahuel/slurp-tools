import { w as push, Q as head, y as pop, E as escape_html, K as attr, N as attr_style, R as store_get, M as attr_class, S as unsubscribe_stores } from './index-MYp04YD4.js';
import { o as onDestroy } from './index-server-rOK-Pkpj.js';
import { i as imageEditorStore, I as ImageEditorLayout } from './ImageEditorLayout-C7QIeH82.js';
import { F as FileManagementSidebar, H as HistoryControlsSidebar, D as DownloadSidebar } from './DownloadSidebar-Dg8ykSer.js';
import { d as destroyCropperInstance } from './cropperUtils-Cy5Ckuh7.js';
import './index2-CMxvAIQo.js';

function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let canControlCropper, canApply;
  let cropperInstance = null;
  let zoom = 100;
  let aspectRatioLabel = "Free";
  let croppedAreaPixels = null;
  let imageUUID, imageUrl, isLoading, isApplying, errorMessage;
  const unsubscribeStore = imageEditorStore.subscribe((state) => {
    if (imageUrl !== state.imageUrl && state.imageUrl) {
      cropperInstance = destroyCropperInstance(cropperInstance);
      croppedAreaPixels = null;
      imageUrl = state.imageUrl;
    } else if (!state.imageUrl && cropperInstance) {
      cropperInstance = destroyCropperInstance(cropperInstance);
      croppedAreaPixels = null;
      imageUrl = state.imageUrl;
    }
    if (imageUUID !== state.imageUUID) imageUUID = state.imageUUID;
    if (isLoading !== state.isLoading) isLoading = state.isLoading;
    if (isApplying !== state.isApplying) isApplying = state.isApplying;
    if (errorMessage !== state.errorMessage) errorMessage = state.errorMessage;
  });
  onDestroy(() => {
    unsubscribeStore();
    cropperInstance = destroyCropperInstance(cropperInstance);
    imageEditorStore.cleanupBlobUrl();
  });
  canControlCropper = !!cropperInstance && !isLoading && !isApplying;
  canApply = canControlCropper && !!croppedAreaPixels && croppedAreaPixels.width > 0 && croppedAreaPixels.height > 0;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Crop Image - Slurp Tools</title>`;
  });
  ImageEditorLayout($$payload, {
    toolTitle: "Image Cropper",
    toolDescription: "Select an image, adjust the selection, and apply the crop.",
    $$slots: {
      "toolbar-left": ($$payload2) => {
        $$payload2.out += `<div slot="toolbar-left" class="svelte-n07j1b"><span class="toolbar-label svelte-n07j1b">Aspect Ratio:</span> <div class="aspect-ratio-controls svelte-n07j1b"><button${attr("disabled", !canControlCropper, true)}${attr_class("svelte-n07j1b", void 0, { "active": aspectRatioLabel === "Free" })}>Free</button> <button${attr("disabled", !canControlCropper, true)}${attr_class("svelte-n07j1b", void 0, { "active": aspectRatioLabel === "1:1" })}>1:1</button> <button${attr("disabled", !canControlCropper, true)}${attr_class("svelte-n07j1b", void 0, { "active": aspectRatioLabel === "4:3" })}>4:3</button> <button${attr("disabled", !canControlCropper, true)}${attr_class("svelte-n07j1b", void 0, { "active": aspectRatioLabel === "16:9" })}>16:9</button></div></div>`;
      },
      "toolbar-right": ($$payload2) => {
        $$payload2.out += `<div slot="toolbar-right" class="svelte-n07j1b"><button class="apply-button button-like toolbar-button svelte-n07j1b"${attr("disabled", !canApply, true)}>`;
        if (isApplying) {
          $$payload2.out += "<!--[-->";
          $$payload2.out += `<span class="button-spinner svelte-n07j1b"></span> Applying...`;
        } else {
          $$payload2.out += "<!--[!-->";
          $$payload2.out += `Apply Crop`;
        }
        $$payload2.out += `<!--]--></button></div>`;
      },
      "main-content": ($$payload2) => {
        $$payload2.out += `<div slot="main-content" class="cropper-main-content svelte-n07j1b">`;
        if (imageUrl) {
          $$payload2.out += "<!--[-->";
          $$payload2.out += `<div class="cropper-container svelte-n07j1b"><img${attr("src", imageUrl)}${attr("alt", store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore).originalFilename || "Image to crop")}${attr("key", imageUrl)} class="crop-image svelte-n07j1b" crossorigin="anonymous"${attr_style("", {
            opacity: isLoading && !cropperInstance ? 0.5 : 1
          })}></div>`;
        } else if (!isLoading) {
          $$payload2.out += "<!--[1-->";
          $$payload2.out += `<p class="placeholder-text svelte-n07j1b">Select an image to start.</p>`;
        } else {
          $$payload2.out += "<!--[!-->";
        }
        $$payload2.out += `<!--]--></div>`;
      },
      "sidebar-content": ($$payload2, { openFilePicker }) => {
        {
          FileManagementSidebar($$payload2, {});
          $$payload2.out += `<!----> <div class="sidebar-section section-details svelte-n07j1b"><h4 class="h4-pink svelte-n07j1b">Current Selection</h4> `;
          if (croppedAreaPixels && canControlCropper) {
            $$payload2.out += "<!--[-->";
            $$payload2.out += `<div class="details-grid svelte-n07j1b"><span class="svelte-n07j1b">W:</span> <span class="svelte-n07j1b">${escape_html(croppedAreaPixels.width)}px</span> <span class="svelte-n07j1b">H:</span> <span class="svelte-n07j1b">${escape_html(croppedAreaPixels.height)}px</span> <span class="svelte-n07j1b">X:</span> <span class="svelte-n07j1b">${escape_html(croppedAreaPixels.x)}px</span> <span class="svelte-n07j1b">Y:</span> <span class="svelte-n07j1b">${escape_html(croppedAreaPixels.y)}px</span></div>`;
          } else if (imageUUID && !isLoading && !isApplying) {
            $$payload2.out += "<!--[1-->";
            $$payload2.out += `<p class="placeholder-text-small svelte-n07j1b">Initializing crop area...</p>`;
          } else if (isLoading) {
            $$payload2.out += "<!--[2-->";
            $$payload2.out += `<p class="placeholder-text-small svelte-n07j1b">Loading...</p>`;
          } else {
            $$payload2.out += "<!--[!-->";
            $$payload2.out += `<p class="placeholder-text-small svelte-n07j1b">No selection.</p>`;
          }
          $$payload2.out += `<!--]--></div> <div class="sidebar-section section-controls svelte-n07j1b"><h4 class="h4-teal svelte-n07j1b">Controls</h4> <div class="control-item zoom-controls svelte-n07j1b"><label for="zoom-slider" class="svelte-n07j1b">Zoom</label> <input id="zoom-slider" type="range" min="1" max="500" step="1"${attr("value", zoom)} class="zoom-slider svelte-n07j1b"${attr("disabled", !canControlCropper, true)}> <span class="zoom-value svelte-n07j1b">${escape_html(zoom)}%</span></div></div> `;
          HistoryControlsSidebar($$payload2, {});
          $$payload2.out += `<!----> `;
          DownloadSidebar($$payload2);
          $$payload2.out += `<!---->`;
        }
      }
    }
  });
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DV8N7zFF.js.map
