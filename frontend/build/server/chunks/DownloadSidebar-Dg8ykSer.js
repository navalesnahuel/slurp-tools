import { w as push, J as fallback, R as store_get, M as attr_class, P as stringify, K as attr, E as escape_html, S as unsubscribe_stores, O as bind_props, y as pop } from './index-MYp04YD4.js';
import { i as imageEditorStore } from './ImageEditorLayout-C7QIeH82.js';
import { o as onDestroy } from './index-server-rOK-Pkpj.js';

function truncateFilename(name, length = 25) {
  if (!name) return "";
  if (name.length <= length) return name;
  const extIndex = name.lastIndexOf(".");
  const ext = extIndex !== -1 ? name.substring(extIndex) : "";
  const base = extIndex !== -1 ? name.substring(0, extIndex) : name;
  const maxBaseLength = Math.max(0, length - ext.length - (ext.length > 0 ? 3 : 0));
  if (maxBaseLength <= 0) {
    return name.substring(0, length - 3) + "...";
  }
  const truncatedBase = base.length > maxBaseLength ? base.substring(0, maxBaseLength) : base;
  return `${truncatedBase}...${ext}`;
}
function FileManagementSidebar($$payload, $$props) {
  push();
  var $$store_subs;
  let originalFilename, imageUUID, isLoading, truncatedName, imageIdShort;
  let extraClass = fallback($$props["extraClass"], "");
  ({ originalFilename, imageUUID, isLoading } = store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore));
  truncatedName = truncateFilename(originalFilename);
  imageIdShort = imageUUID ? `${imageUUID.substring(0, 8)}...` : "";
  $$payload.out += `<div${attr_class(`sidebar-section file-management ${stringify(extraClass)}`, "svelte-1s4yqi3")}>`;
  if (originalFilename) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<p class="filename svelte-1s4yqi3"${attr("title", originalFilename)}>${escape_html(truncatedName)}</p>`;
  } else if (imageUUID) {
    $$payload.out += "<!--[1-->";
    $$payload.out += `<p class="filename svelte-1s4yqi3">ID: ${escape_html(imageIdShort)}</p>`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<p class="placeholder-text svelte-1s4yqi3">No image selected.</p>`;
  }
  $$payload.out += `<!--]--> <button class="button-like change-button svelte-1s4yqi3"${attr("disabled", isLoading, true)}>Change Image</button></div>`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  bind_props($$props, { extraClass });
  pop();
}
function HistoryControlsSidebar($$payload, $$props) {
  push();
  let canUndo, canRedo;
  let extraClass = fallback($$props["extraClass"], "");
  let imageUUID, isLoading, isApplying;
  const unsubscribe = imageEditorStore.subscribe((state) => {
    imageUUID = state.imageUUID;
    isLoading = state.isLoading;
    isApplying = state.isApplying;
  });
  onDestroy(unsubscribe);
  canUndo = !!imageUUID && !isLoading && !isApplying;
  canRedo = !!imageUUID && !isLoading && !isApplying;
  $$payload.out += `<div${attr_class(`sidebar-section history-controls-section ${stringify(extraClass)}`, "svelte-3dzuek")}><div class="control-item history-controls svelte-3dzuek"><button class="button-like history-button svelte-3dzuek"${attr("disabled", !canUndo, true)}${attr("title", canUndo ? "Undo" : "Nothing to undo")}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="svelte-3dzuek"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"></path><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"></path></svg> <span class="svelte-3dzuek">Undo</span></button> <button class="button-like history-button svelte-3dzuek"${attr("disabled", !canRedo, true)}${attr("title", canRedo ? "Redo" : "Nothing to redo")}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="svelte-3dzuek"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"></path><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36-1.966a.25.25 0 0 1 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"></path></svg> <span class="svelte-3dzuek">Redo</span></button></div></div>`;
  bind_props($$props, { extraClass });
  pop();
}
function DownloadSidebar($$payload, $$props) {
  push();
  var $$store_subs;
  let imageUUID, imageUrl, isLoading, isApplying, canDownload;
  ({ imageUUID, imageUrl, isLoading, isApplying } = store_get($$store_subs ??= {}, "$imageEditorStore", imageEditorStore));
  canDownload = !!imageUUID && !!imageUrl && !isLoading && !isApplying;
  $$payload.out += `<div class="sidebar-section download-section svelte-ekmnog"><button class="button-like save-button svelte-ekmnog"${attr("disabled", !canDownload, true)}>Download Image</button></div>`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}

export { DownloadSidebar as D, FileManagementSidebar as F, HistoryControlsSidebar as H };
//# sourceMappingURL=DownloadSidebar-Dg8ykSer.js.map
