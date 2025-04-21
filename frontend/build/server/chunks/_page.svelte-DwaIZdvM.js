import { w as push, Q as head, y as pop, K as attr, E as escape_html, N as attr_style, R as store_get, S as unsubscribe_stores } from './index-MYp04YD4.js';
import { o as onDestroy } from './index-server-rOK-Pkpj.js';
import { i as imageEditorStore, I as ImageEditorLayout } from './ImageEditorLayout-C7QIeH82.js';
import { F as FileManagementSidebar, H as HistoryControlsSidebar, D as DownloadSidebar } from './DownloadSidebar-Dg8ykSer.js';
import './index2-CMxvAIQo.js';

function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let canApplyRotate, displayError;
  let rotationAngle = 0;
  let imageUUID, imageUrl, isLoading, isApplying, storeErrorMessage;
  const unsubscribeStore = imageEditorStore.subscribe((state) => {
    imageUUID = state.imageUUID;
    imageUrl = state.imageUrl;
    isLoading = state.isLoading;
    isApplying = state.isApplying;
    storeErrorMessage = state.errorMessage;
  });
  onDestroy(() => {
    unsubscribeStore();
    imageEditorStore.cleanupBlobUrl();
  });
  canApplyRotate = !!imageUUID && !isLoading && !isApplying;
  displayError = storeErrorMessage;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Image Rotator - Slurp Tools</title>`;
  });
  ImageEditorLayout($$payload, {
    toolTitle: "Image Rotator",
    toolDescription: "Select an image to rotate it.",
    $$slots: {
      "toolbar-left": ($$payload2) => {
        $$payload2.out += `<div slot="toolbar-left" class="svelte-p66pkc"><span class="toolbar-label svelte-p66pkc">Rotator</span></div>`;
      },
      "toolbar-right": ($$payload2) => {
        $$payload2.out += `<div slot="toolbar-right" class="svelte-p66pkc"><button class="apply-button button-like toolbar-button svelte-p66pkc"${attr("disabled", !canApplyRotate, true)}${attr("title", canApplyRotate ? `Apply ${rotationAngle}° rotation` : "Load an image first")}>`;
        if (isApplying) {
          $$payload2.out += "<!--[-->";
          $$payload2.out += `<span class="button-spinner svelte-p66pkc"></span> Applying...`;
        } else {
          $$payload2.out += "<!--[!-->";
          $$payload2.out += `Apply Rotate`;
        }
        $$payload2.out += `<!--]--></button></div>`;
      },
      "main-content": ($$payload2) => {
        $$payload2.out += `<div slot="main-content" class="rotate-main-content svelte-p66pkc">`;
        if (imageUrl) {
          $$payload2.out += "<!--[-->";
          $$payload2.out += `<div class="img-container svelte-p66pkc"><img${attr("src", imageUrl)}${attr("alt", store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore).originalFilename || "Image to rotate")}${attr("key", imageUrl)} class="preview-image svelte-p66pkc"${attr_style("", { opacity: isLoading ? 0.5 : 1 })}></div>`;
        } else if (!isLoading) {
          $$payload2.out += "<!--[1-->";
          $$payload2.out += `<p class="placeholder-text svelte-p66pkc">Select an image to start.</p>`;
        } else {
          $$payload2.out += "<!--[!-->";
        }
        $$payload2.out += `<!--]--></div>`;
      },
      "sidebar-content": ($$payload2, { openFilePicker }) => {
        {
          FileManagementSidebar($$payload2, {});
          $$payload2.out += `<!----> <div class="sidebar-section section-rotate svelte-p66pkc"><h4 class="h4-maroon svelte-p66pkc">Rotation</h4> <div class="control-item rotation-slider-group svelte-p66pkc"><label for="rotation-slider" class="svelte-p66pkc">Angle</label> <div class="slider-container svelte-p66pkc"><input id="rotation-slider" type="range" min="-180" max="180" step="1"${attr("value", rotationAngle)} class="rotation-slider svelte-p66pkc"${attr("disabled", isLoading || isApplying || !imageUUID, true)}> <span class="rotation-value svelte-p66pkc">${escape_html(rotationAngle)}°</span></div></div> <div class="control-item quick-rotate-buttons svelte-p66pkc"><button class="button-like quick-button svelte-p66pkc"${attr("disabled", isLoading || isApplying || !imageUUID, true)}>-90°</button> <button class="button-like quick-button svelte-p66pkc"${attr("disabled", isLoading || isApplying || !imageUUID, true)}>0°</button> <button class="button-like quick-button svelte-p66pkc"${attr("disabled", isLoading || isApplying || !imageUUID, true)}>+90°</button> <button class="button-like quick-button svelte-p66pkc"${attr("disabled", isLoading || isApplying || !imageUUID, true)}>180°</button></div></div> `;
          HistoryControlsSidebar($$payload2, {});
          $$payload2.out += `<!----> `;
          DownloadSidebar($$payload2);
          $$payload2.out += `<!----> `;
          if (displayError) {
            $$payload2.out += "<!--[-->";
            $$payload2.out += `<div class="sidebar-error-container svelte-p66pkc"><p class="error-message sidebar-error svelte-p66pkc">${escape_html(displayError)}</p></div>`;
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
//# sourceMappingURL=_page.svelte-DwaIZdvM.js.map
