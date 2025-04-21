import { w as push, Q as head, y as pop, K as attr, E as escape_html, M as attr_class } from './index-MYp04YD4.js';
import { o as onDestroy } from './index-server-rOK-Pkpj.js';
import { I as ImageEditorLayout, i as imageEditorStore, E as ErrorMessageDisplay } from './ImageEditorLayout-C7QIeH82.js';
import { d as destroyCropperInstance } from './cropperUtils-Cy5Ckuh7.js';
import './index2-CMxvAIQo.js';

function _page($$payload, $$props) {
  push();
  let crop_canControlCropper, crop_canApply, isBusy, displayError;
  let activeTool = "crop";
  let isApplying = false, storeErrorMessage = "";
  let cropperInstance = null;
  let crop_zoom = 100;
  onDestroy(() => {
    const instanceToDestroy = cropperInstance;
    cropperInstance = null;
    destroyCropperInstance(instanceToDestroy);
    imageEditorStore.cleanupBlobUrl();
  });
  crop_canControlCropper = !!cropperInstance && true && true;
  crop_canApply = crop_canControlCropper && false;
  isBusy = isApplying;
  displayError = storeErrorMessage;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Image Editor - Slurp Tools</title>`;
  });
  ImageEditorLayout($$payload, {
    toolTitle: "All-in-One Image Editor",
    toolDescription: "Crop, resize, or rotate your image.",
    $$slots: {
      "toolbar-left": ($$payload2) => {
        $$payload2.out += `<div slot="toolbar-left" class="tool-switcher svelte-uoep7n"><button${attr("disabled", isBusy, true)}${attr_class("svelte-uoep7n", void 0, { "active": activeTool === "crop" })}>Crop</button> <button${attr("disabled", isBusy, true)}${attr_class("svelte-uoep7n", void 0, { "active": activeTool === "resize" })}>Resize</button> <button${attr("disabled", isBusy, true)}${attr_class("svelte-uoep7n", void 0, { "active": activeTool === "rotate" })}>Rotate</button></div>`;
      },
      "toolbar-right": ($$payload2) => {
        $$payload2.out += `<div slot="toolbar-right" class="svelte-uoep7n"></div>`;
      },
      "main-content": ($$payload2) => {
        $$payload2.out += `<div slot="main-content" class="editor-main-content svelte-uoep7n">`;
        {
          $$payload2.out += "<!--[1-->";
        }
        $$payload2.out += `<!--]--></div>`;
      },
      "sidebar-content": ($$payload2, { openFilePicker }) => {
        {
          {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]--> `;
          {
            $$payload2.out += "<!--[-->";
            $$payload2.out += `<div class="sidebar-section section-crop svelte-uoep7n"><h4 class="h4-blue svelte-uoep7n">Crop Options</h4> <div class="control-item zoom-controls svelte-uoep7n"><label for="crop-zoom-slider" class="svelte-uoep7n">Zoom</label> <input id="crop-zoom-slider" type="range" min="1" max="500" step="1"${attr("value", crop_zoom)} class="zoom-slider svelte-uoep7n"${attr("disabled", !crop_canControlCropper, true)}> <span class="zoom-value svelte-uoep7n">${escape_html(crop_zoom)}%</span></div> `;
            {
              $$payload2.out += "<!--[!-->";
            }
            $$payload2.out += `<!--]--> <button class="button-like apply-button apply-crop svelte-uoep7n"${attr("disabled", !crop_canApply, true)}>`;
            {
              $$payload2.out += "<!--[!-->";
              $$payload2.out += `Apply
						Crop`;
            }
            $$payload2.out += `<!--]--></button></div>`;
          }
          $$payload2.out += `<!--]--> `;
          {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]--> `;
          {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]--> `;
          {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]--> `;
          if (displayError) {
            $$payload2.out += "<!--[-->";
            $$payload2.out += `<div class="sidebar-error-container svelte-uoep7n">`;
            ErrorMessageDisplay($$payload2, { message: displayError, context: "sidebar" });
            $$payload2.out += `<!----></div>`;
          } else {
            $$payload2.out += "<!--[!-->";
          }
          $$payload2.out += `<!--]-->`;
        }
      }
    }
  });
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CUfJNORF.js.map
