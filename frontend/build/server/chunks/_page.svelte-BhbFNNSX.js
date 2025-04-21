import { w as push, T as copy_payload, U as assign_payload, y as pop, Q as head, K as attr, E as escape_html, I as ensure_array_like, J as fallback, M as attr_class, O as bind_props } from './index-MYp04YD4.js';
import { o as onDestroy } from './index-server-rOK-Pkpj.js';
import { I as ImageEditorLayout, E as ErrorMessageDisplay } from './ImageEditorLayout-C7QIeH82.js';
import './index2-CMxvAIQo.js';

function PdfPreviewItem($$payload, $$props) {
  push();
  let truncatedName;
  let preview = $$props["preview"];
  let isFirst = fallback($$props["isFirst"], false);
  let isLast = fallback($$props["isLast"], false);
  let disabled = fallback($$props["disabled"], false);
  truncatedName = preview.file.name.length > 20 ? preview.file.name.substring(0, 18) + "..." : preview.file.name;
  $$payload.out += `<div${attr_class("preview-item svelte-12rlkzt", void 0, { "disabled": disabled })}><img${attr("src", preview.previewUrl)}${attr("alt", preview.file.name)}${attr("title", preview.file.name)} class="preview-thumbnail svelte-12rlkzt"> <p class="preview-filename svelte-12rlkzt"${attr("title", preview.file.name)}>${escape_html(truncatedName)}</p> <div class="preview-controls svelte-12rlkzt"><button class="control-button move-button svelte-12rlkzt" title="Move Up"${attr("disabled", isFirst || disabled, true)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="svelte-12rlkzt"><path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5"></path></svg></button> <button class="control-button move-button svelte-12rlkzt" title="Move Down"${attr("disabled", isLast || disabled, true)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="svelte-12rlkzt"><path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1"></path></svg></button> <button class="control-button remove-button svelte-12rlkzt" title="Remove Image"${attr("disabled", disabled, true)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="svelte-12rlkzt"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"></path><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"></path></svg></button></div></div>`;
  bind_props($$props, { preview, isFirst, isLast, disabled });
  pop();
}
function _page($$payload, $$props) {
  push();
  let hasImages, showEditor, canGeneratePdf, disableActions;
  let imagePreviews = [];
  let isGeneratingPdf = false;
  let errorMessage = "";
  let isLoadingFiles = false;
  onDestroy(() => {
    imagePreviews.forEach((p) => {
      if (p.previewUrl) {
        URL.revokeObjectURL(p.previewUrl);
      }
    });
  });
  hasImages = imagePreviews.length > 0;
  showEditor = hasImages || isLoadingFiles;
  canGeneratePdf = hasImages && true && !isLoadingFiles;
  disableActions = isLoadingFiles;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    head($$payload2, ($$payload3) => {
      $$payload3.title = `<title>Image to PDF Generator</title>`;
    });
    ImageEditorLayout($$payload2, {
      toolTitle: "Image to PDF",
      toolDescription: "Select images, order them, and generate a PDF.",
      get isLoading() {
        return isLoadingFiles;
      },
      set isLoading($$value) {
        isLoadingFiles = $$value;
        $$settled = false;
      },
      get errorMessage() {
        return errorMessage;
      },
      set errorMessage($$value) {
        errorMessage = $$value;
        $$settled = false;
      },
      get hasImage() {
        return showEditor;
      },
      set hasImage($$value) {
        showEditor = $$value;
        $$settled = false;
      },
      $$slots: {
        "toolbar-left": ($$payload3) => {
          $$payload3.out += `<div slot="toolbar-left" class="svelte-1slf5cd"><span class="toolbar-label svelte-1slf5cd">PDF Generator</span></div>`;
        },
        "toolbar-right": ($$payload3) => {
          $$payload3.out += `<div slot="toolbar-right" class="svelte-1slf5cd"><button class="button-like apply-button toolbar-button svelte-1slf5cd"${attr("disabled", !canGeneratePdf, true)}${attr("title", canGeneratePdf ? `Generate PDF with ${imagePreviews.length} image(s)` : "Add images first or wait")}>`;
          if (isLoadingFiles && hasImages) {
            $$payload3.out += "<!--[1-->";
            $$payload3.out += `<span class="button-spinner svelte-1slf5cd"></span> Loading...`;
          } else {
            $$payload3.out += "<!--[!-->";
            $$payload3.out += `Generate PDF (${escape_html(imagePreviews.length)})`;
          }
          $$payload3.out += `<!--]--></button></div>`;
        },
        "main-content": ($$payload3) => {
          $$payload3.out += `<div slot="main-content" class="pdf-main-area svelte-1slf5cd">`;
          if (isLoadingFiles && !hasImages) {
            $$payload3.out += "<!--[-->";
          } else if (isLoadingFiles && hasImages) {
            $$payload3.out += "<!--[1-->";
            $$payload3.out += `<div class="main-area-overlay svelte-1slf5cd"><div class="spinner svelte-1slf5cd"></div> <p class="svelte-1slf5cd">Adding images...</p></div>`;
          } else {
            $$payload3.out += "<!--[!-->";
          }
          $$payload3.out += `<!--]--> `;
          if (hasImages) {
            $$payload3.out += "<!--[-->";
            const each_array = ensure_array_like(imagePreviews);
            $$payload3.out += `<div class="preview-grid svelte-1slf5cd"><!--[-->`;
            for (let index = 0, $$length = each_array.length; index < $$length; index++) {
              let preview = each_array[index];
              PdfPreviewItem($$payload3, {
                preview,
                isFirst: index === 0,
                isLast: index === imagePreviews.length - 1,
                disabled: disableActions
              });
            }
            $$payload3.out += `<!--]--></div>`;
          } else if (!isLoadingFiles) {
            $$payload3.out += "<!--[1-->";
            $$payload3.out += `<p class="placeholder-text svelte-1slf5cd">No images selected yet. Click "Add More Images".</p>`;
          } else {
            $$payload3.out += "<!--[!-->";
          }
          $$payload3.out += `<!--]--></div>`;
        },
        "sidebar-content": ($$payload3, { openFilePickerIgnored }) => {
          {
            $$payload3.out += `<div class="sidebar-section section-actions svelte-1slf5cd"><h4 class="h4-lavender svelte-1slf5cd">Manage Images</h4> <div class="sidebar-button-group svelte-1slf5cd"><button class="button-like add-more-button svelte-1slf5cd"${attr("disabled", disableActions, true)}>Add More Images</button> <button class="button-like clear-button svelte-1slf5cd"${attr("disabled", disableActions || !hasImages, true)}>Clear All (${escape_html(imagePreviews.length)})</button></div></div> `;
            if (errorMessage) {
              $$payload3.out += "<!--[-->";
              ErrorMessageDisplay($$payload3, { message: errorMessage, context: "sidebar" });
            } else {
              $$payload3.out += "<!--[!-->";
            }
            $$payload3.out += `<!--]-->`;
          }
        }
      }
    });
    $$payload2.out += `<!----> <input type="file" id="file-input-pdf" accept="image/png, image/jpeg, image/webp, image/gif, image/bmp, image/tiff" style="display: none;" multiple${attr("disabled", isLoadingFiles || isGeneratingPdf, true)} class="svelte-1slf5cd">`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BhbFNNSX.js.map
