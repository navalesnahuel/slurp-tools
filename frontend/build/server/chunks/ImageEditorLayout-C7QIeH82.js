import { w as push, J as fallback, R as store_get, M as attr_class, C as slot, E as escape_html, K as attr, S as unsubscribe_stores, O as bind_props, y as pop, P as stringify } from './index-MYp04YD4.js';
import { w as writable, g as get } from './index2-CMxvAIQo.js';

const API_BASE_URL = "http://localhost:3000";
async function redoChanges(uuid) {
  if (!uuid) throw new Error("UUID is required to redo changes");
  try {
    const response = await fetch(`${API_BASE_URL}/image/${uuid}/redo?t=${Date.now()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Redo failed: ${err}`);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    throw new Error(`Redo Error: ${err.message}`);
  }
}
async function undoChanges(uuid) {
  if (!uuid) throw new Error("UUID is required to undo changes");
  try {
    const response = await fetch(`${API_BASE_URL}/image/${uuid}/undo?t=${Date.now()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Undo failed: ${err}`);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    throw new Error(`Undo Error: ${err.message}`);
  }
}
const initialState = {
  imageFile: null,
  originalFilename: "",
  imageUUID: null,
  imageUrl: "",
  currentBlobUrl: null,
  imageInfo: null,
  originalDimensions: null,
  isLoading: false,
  isApplying: false,
  loadingStep: "",
  errorMessage: ""
};
function createImageEditorStore() {
  const { subscribe, set, update } = writable({ ...initialState });
  function _setApplying(applying, step = "Applying changes...") {
    update((state) => ({
      ...state,
      isApplying: applying,
      isLoading: applying,
      loadingStep: step ,
      errorMessage: "" 
    }));
  }
  function _setError(message2) {
    update((state) => ({
      ...state,
      errorMessage: message2,
      isLoading: false,
      isApplying: false,
      loadingStep: ""
    }));
  }
  function _cleanupBlobUrl() {
    update((state) => {
      if (state.currentBlobUrl && state.currentBlobUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(state.currentBlobUrl);
        } catch (e) {
        }
        return { ...state, currentBlobUrl: null };
      }
      return state;
    });
  }
  function _resetState(keepError = false) {
    const currentError = get({ subscribe }).errorMessage;
    _cleanupBlobUrl();
    set({ ...initialState, errorMessage: keepError ? currentError : "" });
  }
  async function selectAndUpload(file) {
    return;
  }
  async function refreshImage(resetApplying = true) {
    get({ subscribe }).imageUUID;
    {
      _resetState();
      return;
    }
  }
  function imageLoadComplete(dimensions) {
    update((state) => ({
      ...state,
      isLoading: false,
      isApplying: false,
      loadingStep: "",
      originalDimensions: dimensions
    }));
  }
  function imageLoadError(errorMsg = "Failed to load image preview.") {
    _setError(errorMsg);
    update((state) => ({ ...state, imageUrl: "", originalDimensions: null }));
  }
  async function applyFilter(filterFn, filterName = "filter") {
    const state = get({ subscribe });
    if (!state.imageUUID || state.isApplying || state.isLoading) {
      return;
    }
    _setApplying(true, `Applying ${filterName}...`);
    try {
      const result = await filterFn(state.imageUUID);
      update((s) => ({
        ...s,
        imageUUID: result.UUID,
        imageInfo: result
      }));
      await refreshImage(false);
    } catch (error) {
      update((state2) => ({
        ...state2,
        isLoading: false,
        isApplying: false,
        loadingStep: ""
      }));
    }
  }
  async function undo() {
    await applyFilter(undoChanges, "Undo");
  }
  async function redo() {
    await applyFilter(redoChanges, "Redo");
  }
  function changeImage() {
    _resetState();
  }
  return {
    subscribe,
    selectAndUpload,
    refreshImage,
    applyFilter,
    undo,
    redo,
    changeImage,
    resetState: _resetState,
    cleanupBlobUrl: _cleanupBlobUrl,
    imageLoadComplete,
    imageLoadError
  };
}
const imageEditorStore = createImageEditorStore();
function ErrorMessageDisplay($$payload, $$props) {
  let message2 = $$props["message"];
  let context = fallback($$props["context"], "general");
  if (message2) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<p${attr_class(`error-message ${stringify(context)}`, "svelte-1iv3s0i")}>${escape_html(message2)}</p>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { message: message2, context });
}
function InitialUploadPrompt($$payload, $$props) {
  push();
  let title = fallback($$props["title"], "Image Tool");
  let description = fallback($$props["description"], "Select an image to begin.");
  let errorMessage = fallback($$props["errorMessage"], "");
  $$payload.out += `<div class="initial-upload-state svelte-bd2ovr"><h1 class="svelte-bd2ovr">${escape_html(title)}</h1> <p class="tool-description svelte-bd2ovr">${escape_html(description)}</p> <div class="input-area file-input-section svelte-bd2ovr"><button class="file-label button-like svelte-bd2ovr"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="margin-bottom: 0.5rem;" class="svelte-bd2ovr"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"></path></svg> Open Image</button></div> `;
  if (errorMessage) {
    $$payload.out += "<!--[-->";
    ErrorMessageDisplay($$payload, { message, context: "initial" });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div>`;
  bind_props($$props, { title, description, errorMessage });
  pop();
}
function LoadingIndicator($$payload, $$props) {
  let message2 = fallback($$props["message"], "Loading...");
  let errorMessage = fallback($$props["errorMessage"], "");
  $$payload.out += `<div class="loading-state svelte-1fo0o4y"><div class="spinner svelte-1fo0o4y"></div> <p class="svelte-1fo0o4y">${escape_html(message2)}</p> `;
  if (errorMessage) {
    $$payload.out += "<!--[-->";
    ErrorMessageDisplay($$payload, { message: message2, context: "loading" });
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div>`;
  bind_props($$props, { message: message2, errorMessage });
}
function ImageEditorLayout($$payload, $$props) {
  push();
  var $$store_subs;
  let isLoading, loadingStep, errorMessage, hasImage;
  let toolTitle = fallback($$props["toolTitle"], "Image Editor");
  let toolDescription = fallback($$props["toolDescription"], "Select an image to start editing.");
  function openFilePicker() {
  }
  isLoading = store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore).isLoading;
  store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore).isApplying;
  loadingStep = store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore).loadingStep;
  errorMessage = store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore).errorMessage;
  hasImage = !!store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore).imageUUID || !!store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore).imageUrl;
  $$payload.out += `<div class="editor-layout-wrapper svelte-d9t0zt"><div class="page-container svelte-d9t0zt">`;
  if (!hasImage && !isLoading) {
    $$payload.out += "<!--[-->";
    InitialUploadPrompt($$payload, {
      title: toolTitle,
      description: toolDescription,
      errorMessage
    });
  } else if (isLoading && (!hasImage || !store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore).imageUrl)) {
    $$payload.out += "<!--[1-->";
    LoadingIndicator($$payload, {
      message: loadingStep || "Loading...",
      errorMessage
    });
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<div${attr_class("editor-interface svelte-d9t0zt", void 0, { "loading": isLoading })}><div class="top-toolbar svelte-d9t0zt"><div class="toolbar-left svelte-d9t0zt"><!---->`;
    slot($$payload, $$props, "toolbar-left", { openFilePicker });
    $$payload.out += `<!----></div> <div class="toolbar-right svelte-d9t0zt"><!---->`;
    slot($$payload, $$props, "toolbar-right", { openFilePicker });
    $$payload.out += `<!----></div></div> <div class="main-area svelte-d9t0zt"><!---->`;
    slot($$payload, $$props, "main-content", {});
    $$payload.out += `<!----> `;
    if (isLoading && hasImage && store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore).imageUrl) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<div class="main-area-overlay svelte-d9t0zt"><div class="spinner svelte-d9t0zt"></div> `;
      if (loadingStep) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<p class="svelte-d9t0zt">${escape_html(loadingStep)}</p>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--></div>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div> <div class="right-sidebar svelte-d9t0zt"><!---->`;
    slot($$payload, $$props, "sidebar-content", { openFilePicker });
    $$payload.out += `<!----> `;
    if (errorMessage) {
      $$payload.out += "<!--[-->";
      ErrorMessageDisplay($$payload, { message: errorMessage, context: "sidebar" });
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div></div>`;
  }
  $$payload.out += `<!--]--> <input type="file" accept="image/png, image/jpeg, image/webp, image/gif" style="display: none;"${attr("disabled", isLoading, true)} class="svelte-d9t0zt"></div></div>`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  bind_props($$props, { toolTitle, toolDescription });
  pop();
}

export { ErrorMessageDisplay as E, ImageEditorLayout as I, imageEditorStore as i };
//# sourceMappingURL=ImageEditorLayout-C7QIeH82.js.map
