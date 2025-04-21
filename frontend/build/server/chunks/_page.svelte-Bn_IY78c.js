import { I as ensure_array_like, J as fallback, K as attr, M as attr_class, N as attr_style, E as escape_html, O as bind_props, P as stringify } from './index-MYp04YD4.js';

function ToolCard($$payload, $$props) {
  let title = fallback($$props["title"], "Tool Title");
  let description = fallback($$props["description"], "A short, clear description of what this amazing tool does.");
  let link = fallback($$props["link"], "#");
  let icon = fallback($$props["icon"], "✨");
  let comingSoon = fallback($$props["comingSoon"], false);
  let accentColor = fallback($$props["accentColor"], "green");
  let delay = fallback($$props["delay"], 0);
  $$payload.out += `<a${attr("href", comingSoon ? "#" : link)}${attr_class("tool-card svelte-1bz35qv", void 0, { "coming-soon": comingSoon })}${attr("title", comingSoon ? `${title} (Coming Soon)` : title)}${attr_style(`--card-accent: var(--${stringify(accentColor)});`)}><div class="shine-container svelte-1bz35qv"></div> <div class="card-content svelte-1bz35qv"><div class="icon-wrapper svelte-1bz35qv"><span class="icon svelte-1bz35qv">${escape_html(icon)}</span></div> <div class="text-content svelte-1bz35qv"><h3 class="title svelte-1bz35qv">${escape_html(title)}</h3> <p class="description svelte-1bz35qv">${escape_html(description)}</p></div></div> `;
  if (comingSoon) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<span class="status-badge svelte-1bz35qv">Coming Soon</span>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></a>`;
  bind_props($$props, {
    title,
    description,
    link,
    icon,
    comingSoon,
    accentColor,
    delay
  });
}
function _page($$payload) {
  const tools = [
    {
      title: "Image Rotate",
      description: "Rotate your images left, right, or flip them vertically and horizontally with ease.",
      link: "/image-rotate",
      icon: "🔄",
      accentColor: "blue",
      comingSoon: false
    },
    {
      title: "Image Resize",
      description: "Quickly resize your images by setting custom dimensions or using presets.",
      link: "/image-resize",
      icon: "📐",
      accentColor: "red",
      comingSoon: false
    },
    {
      title: "Image Crop",
      description: "Crop unwanted parts of your image manually or with aspect ratio presets.",
      link: "/image-crop",
      icon: "✂️",
      accentColor: "crust",
      comingSoon: false
    },
    {
      title: "Image Editor",
      description: "Edit your images with basic tools like crop, rotate, resize, filters, and more.",
      link: "/image-editor",
      icon: "🖌️",
      accentColor: "green",
      comingSoon: false
    },
    {
      title: "Scan to PDF",
      description: "Enhance scanned documents by cleaning them up and exporting to high-quality PDFs.",
      link: "/image-scan",
      icon: "📷",
      accentColor: "peach",
      comingSoon: false
    },
    {
      title: "Images to PDF",
      description: "Convert multiple images (JPG, PNG, WEBP) into a single organized PDF document.",
      link: "/image-to-pdf",
      icon: "📄",
      accentColor: "mauve",
      comingSoon: false
    }
  ];
  const each_array = ensure_array_like(tools);
  $$payload.out += `<section class="page-hero svelte-i3wciy"><div class="hero-content svelte-i3wciy"><h1 class="headline svelte-i3wciy">Simplify Your Digital Tasks</h1> <p class="tagline svelte-i3wciy">Slurp Tools offers a collection of fast, focused and bloat-free utilities <br>for your everyday image and document needs and without ads.</p></div></section> <section class="tools-section svelte-i3wciy" id="tools"><div class="grid-container svelte-i3wciy"><!--[-->`;
  for (let index = 0, $$length = each_array.length; index < $$length; index++) {
    let tool = each_array[index];
    ToolCard($$payload, {
      title: tool.title,
      description: tool.description,
      link: tool.link,
      icon: tool.icon,
      accentColor: tool.accentColor,
      comingSoon: tool.comingSoon,
      delay: index * 80
    });
  }
  $$payload.out += `<!--]--></div></section>`;
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Bn_IY78c.js.map
