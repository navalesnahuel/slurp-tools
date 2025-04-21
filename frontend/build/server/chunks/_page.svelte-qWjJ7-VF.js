import { w as push, Q as head, K as attr, E as escape_html, M as attr_class, y as pop } from './index-MYp04YD4.js';
import { o as onDestroy } from './index-server-rOK-Pkpj.js';

function _page($$payload, $$props) {
  push();
  let isBusy, isImageSelected, isInitialLocalImageLoaded, isImageProcessed, canApplyScan, canEdit, canUndo, canRedo, canOpenImage, canDownloadPdf;
  let imageInfo = null;
  let isGeneratingPdf = false;
  onDestroy(() => {
  });
  isBusy = isGeneratingPdf;
  isImageSelected = false;
  isInitialLocalImageLoaded = false;
  isImageProcessed = false;
  canApplyScan = isInitialLocalImageLoaded && !isBusy;
  canEdit = isImageProcessed && !isBusy;
  canUndo = canEdit && imageInfo?.Version > 0;
  canRedo = canEdit;
  canOpenImage = isImageProcessed && !isBusy;
  canDownloadPdf = isImageProcessed && !isBusy;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Image Scanner - Slurp Tools</title>`;
  });
  $$payload.out += `<div class="editor-wrapper svelte-nl3ks"><div class="page-container svelte-nl3ks">`;
  if (!isImageSelected && !isBusy) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="initial-upload-state svelte-nl3ks"><h1 class="svelte-nl3ks">Image Scanner</h1> <p class="tool-description svelte-nl3ks">Select an image, adjust the red corners to define the area, and click "Scan &amp;
					Upload".</p> <div class="input-area file-input-section svelte-nl3ks"><button class="file-label button-like svelte-nl3ks"${attr("disabled", isBusy, true)}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="margin-bottom: 0.5rem;" class="svelte-nl3ks"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" class="svelte-nl3ks"></path></svg>Scan Image</button></div> `;
    {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div>`;
  } else if (isBusy && true) {
    $$payload.out += "<!--[1-->";
    $$payload.out += `<div class="loading-state svelte-nl3ks"><div class="spinner svelte-nl3ks"></div> <p class="svelte-nl3ks">${escape_html("Loading...")}</p> `;
    {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div>`;
  } else if (isImageSelected || isBusy) {
    $$payload.out += "<!--[2-->";
    $$payload.out += `<div${attr_class("editor-interface svelte-nl3ks", void 0, { "loading": isBusy })}><div class="top-toolbar svelte-nl3ks"><div class="toolbar-left svelte-nl3ks"><span class="toolbar-label svelte-nl3ks">Scanner</span></div> <div class="toolbar-right svelte-nl3ks"><button class="apply-button button-like toolbar-button svelte-nl3ks"${attr("disabled", !canApplyScan, true)}${attr("title", !canApplyScan ? "Select image & wait for it to load fully, or process is busy" : "Apply Perspective Correction & Scan Filters")}>`;
    {
      $$payload.out += "<!--[!-->";
      $$payload.out += `Scan &amp; Upload`;
    }
    $$payload.out += `<!--]--></button></div></div> <div class="main-area svelte-nl3ks"><div class="image-canvas-wrapper svelte-nl3ks">`;
    if (!isBusy) {
      $$payload.out += "<!--[1-->";
      $$payload.out += `<p class="placeholder-text error-message svelte-nl3ks">Could not load image.</p>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div> `;
    {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div> <div class="right-sidebar svelte-nl3ks"><div class="sidebar-section file-management svelte-nl3ks"><h4 class="h4-mauve svelte-nl3ks">Image</h4> `;
    {
      $$payload.out += "<!--[!-->";
      $$payload.out += `<p class="placeholder-text svelte-nl3ks">No image loaded.</p>`;
    }
    $$payload.out += `<!--]--> `;
    {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div> <div class="sidebar-section controls svelte-nl3ks"><h4 class="h4-teal svelte-nl3ks">Edit Controls</h4> <div class="control-item history-controls svelte-nl3ks"><button class="button-like history-button svelte-nl3ks"${attr("disabled", !canEdit, true)} title="Rotate 90° Clockwise"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="svelte-nl3ks"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" class="svelte-nl3ks"></path><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" class="svelte-nl3ks"></path></svg> <span class="svelte-nl3ks">Rotate 90°</span></button><button class="button-like history-button svelte-nl3ks"${attr("disabled", !canEdit, true)} title="Rotate 90° Counter-Clockwise"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="svelte-nl3ks"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z" class="svelte-nl3ks"></path><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z" class="svelte-nl3ks"></path></svg> <span class="svelte-nl3ks">Rotate -90°</span></button></div> <div class="control-item history-controls svelte-nl3ks"><button class="button-like history-button svelte-nl3ks"${attr("disabled", !canUndo, true)} title="Undo Last Action"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="svelte-nl3ks"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z" class="svelte-nl3ks"></path><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z" class="svelte-nl3ks"></path></svg> <span class="svelte-nl3ks">Undo</span></button><button class="button-like history-button svelte-nl3ks"${attr("disabled", !canRedo, true)} title="Redo Last Action"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="svelte-nl3ks"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" class="svelte-nl3ks"></path><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" class="svelte-nl3ks"></path></svg> <span class="svelte-nl3ks">Redo</span></button></div></div> <div class="sidebar-section download-section svelte-nl3ks"><div style="display: flex; flex-direction: column; gap: 0.8rem;" class="svelte-nl3ks"><button class="button-like save-button svelte-nl3ks"${attr("disabled", !canOpenImage, true)} title="Open final image in a new tab">Open Image</button> <button class="button-like download-pdf-button svelte-nl3ks"${attr("disabled", !canDownloadPdf, true)}${attr("title", !canDownloadPdf ? "Process an image first or wait for current process" : "Generate and download PDF")}>`;
    {
      $$payload.out += "<!--[!-->";
      $$payload.out += `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 0.5em;" class="svelte-nl3ks"><path d="M4.603 14.087a.8.8 0 0 1-1.087.955l-4.2-3.001a.8.8 0 0 1-.033-1.11l2.141-2.263a.8.8 0 1 1 1.162 1.09l-1.28 1.358 3.136 2.24a.8.8 0 0 1 .033 1.11z" class="svelte-nl3ks"></path><path fill-rule="evenodd" d="M5.824 1.936a2.5 2.5 0 0 1 4.352 0l2.141 2.262a.8.8 0 0 1-.033 1.11l-4.2 3.001a.8.8 0 0 1-1.087-.955l1.28-1.358-3.136-2.24a.8.8 0 0 1-.033-1.11l2.141-2.263zM8 5.616a.5.5 0 0 1 .5.5v3.868a.5.5 0 0 1-1 0V6.116a.5.5 0 0 1 .5-.5zm0 7.25a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6z" class="svelte-nl3ks"></path><path d="M12.25 2.642a1.5 1.5 0 0 0-2.75-1.053L8.64 2.5H7.36L6.5 1.589A1.5 1.5 0 0 0 3.75 2.642v10.716A1.5 1.5 0 0 0 5.25 14.9h5.5A1.5 1.5 0 0 0 12.25 13.358V2.642zm-1.5 0a.5.5 0 0 1 .5.5v10.716a.5.5 0 0 1-.5.5h-5.5a.5.5 0 0 1-.5-.5V3.142a.5.5 0 0 1 .5-.5h5.5z" class="svelte-nl3ks"></path></svg> Download PDF`;
    }
    $$payload.out += `<!--]--></button></div></div> `;
    {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <input type="file" id="file-input" accept="image/png, image/jpeg, image/webp, image/gif" style="display: none;" class="svelte-nl3ks"></div></div>`;
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-qWjJ7-VF.js.map
