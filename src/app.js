import {
  ASPECT_RATIOS,
  COMPANIONS,
  DEFAULT_SLIDERS,
  EMOTIONAL_STATES,
  OUTPUT_TYPES,
  PURPOSES,
  SLIDER_SECTIONS,
} from "./promptTypes.js";
import { PRESETS } from "./presets.js";
import { buildPrompt } from "./promptBuilder.js";
import { renderImageFromPrompt } from "./imageService.js?v=6";
import {
  deleteSavedPrompt,
  duplicateSavedPrompt,
  exportSavedPrompts,
  getSavedPromptById,
  getSavedPrompts,
  savePrompt,
} from "./storage.js";

const app = document.querySelector("#app");
let sliders = { ...DEFAULT_SLIDERS };
let latestResult = null;
let editingPromptId = null;
let latestRenderedImage = null;

const titleCaseKey = (key) => key.replace(/\s+/g, "-").toLowerCase();
const cloneTemplate = (id) => document.querySelector(id).content.cloneNode(true);

const fillSelect = (select, options) => {
  select.innerHTML = options.map((option) => `<option value="${option}">${option}</option>`).join("");
};

const downloadText = (filename, text) => {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const fallbackCopyText = (text) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy command was blocked by this browser.");
};

const copyText = async (text, button) => {
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopyText(text);
    }
  } catch {
    fallbackCopyText(text);
  }
  const original = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => {
    button.textContent = original;
  }, 1200);
};

const readForm = () => {
  const form = document.querySelector("#prompt-form");
  const data = new FormData(form);
  return {
    title: data.get("title")?.toString().trim() || "Untitled beauty alchemy prompt",
    purpose: data.get("purpose")?.toString() || PURPOSES[0],
    emotionalState: data.get("emotionalState")?.toString() || EMOTIONAL_STATES[0],
    subject: data.get("subject")?.toString().trim() || "",
    setting: data.get("setting")?.toString().trim() || "",
    companions: data.get("companions")?.toString() || COMPANIONS[0],
    symbols: data.get("symbols")?.toString().trim() || "",
    colourNotes: data.get("colourNotes")?.toString().trim() || "",
    extraNotes: data.get("extraNotes")?.toString().trim() || "",
    aspectRatio: data.get("aspectRatio")?.toString() || ASPECT_RATIOS[0],
    outputType: data.get("outputType")?.toString() || OUTPUT_TYPES[0],
  };
};

const writeForm = (input) => {
  const form = document.querySelector("#prompt-form");
  if (!form || !input) return;
  Object.entries(input).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = Array.isArray(value) ? value.join(", ") : value || "";
  });
};

const settingsText = (settings) =>
  [
    `Backend: ${settings.backend}`,
    `Model: ${settings.model}`,
    `Aspect ratio: ${settings.aspectRatio}`,
    `Resolution target: ${settings.resolutionTarget}`,
    `Quality: ${settings.quality}`,
    `Style strength: ${settings.styleStrength}`,
    `Notes: ${settings.notes}`,
  ].join("\n");

const combinedPackageText = (result) =>
  [
    "Prompt:",
    result.prompt,
    "",
    "Negative prompt:",
    result.negativePrompt,
    "",
    "Settings:",
    settingsText(result.settings),
  ].join("\n");

const renderCombinedPackage = (result) => {
  const target = document.querySelector("#combined-package-output");
  if (!target) return;
  const text = combinedPackageText(result);
  target.innerHTML = `
    <section class="output-block combined-package-box">
      <div class="output-title">
        <h3>Combined prompt package</h3>
        <button class="copy-button" type="button" data-copy-combined>Copy Combined Box</button>
      </div>
      <pre>${text}</pre>
    </section>
  `;
};

const renderOutput = (result) => {
  const output = document.querySelector("#output-content");
  const variants = document.querySelector("#variant-content");
  output.className = "output-stack";
  output.innerHTML = `
    <section class="output-block">
      <div class="output-title"><h3>Prompt</h3><button class="copy-button" data-copy="prompt">Copy Prompt</button></div>
      <p>${result.prompt}</p>
    </section>
    <section class="output-block">
      <div class="output-title"><h3>Negative prompt</h3><button class="copy-button" data-copy="negative">Copy Negative Prompt</button></div>
      <p>${result.negativePrompt}</p>
    </section>
    <section class="output-block">
      <div class="output-title"><h3>Settings</h3><button class="copy-button" data-copy="settings">Copy Settings</button></div>
      <pre>${settingsText(result.settings)}</pre>
    </section>
    <section class="output-block">
      <h3>Interpreted style summary</h3>
      <p>${result.interpretedSummary}</p>
    </section>
    <div class="button-row">
      <button class="primary-button" type="button" data-action="save">Save Prompt</button>
      <button class="primary-button" type="button" data-action="render-image">Render Image</button>
      <button class="secondary-button" type="button" data-action="export-json">Export JSON</button>
    </div>
    <section class="output-block image-render-block">
      <div class="output-title">
        <h3>Rendered image</h3>
        <span class="model-pill">gpt-image-2</span>
      </div>
      <div id="image-render-content" class="image-render-content">
        Generate the prompt, then render it with the latest OpenAI GPT Image model.
      </div>
    </section>
  `;

  variants.className = "variant-list";
  variants.innerHTML = result.variants
    .map(
      (variant, index) => `
        <article class="variant-card">
          <div class="output-title">
            <h3>${index + 1}. ${["Softer and more restorative", "More mystical and symbolic", "More vivid and psychedelic"][index]}</h3>
            <button class="copy-button" data-copy-variant="${index}">Copy</button>
          </div>
          <p>${variant}</p>
        </article>`
    )
    .join("");
};

const renderImagePreview = (payload) => {
  latestRenderedImage = payload;
  const target = document.querySelector("#image-render-content");
  if (!target) return;
  target.className = "image-render-content has-image";
  target.innerHTML = `
    <img src="${payload.imageUrl}" alt="Rendered Beauty Alchemy image" />
    <div class="button-row">
      <a class="secondary-button link-button" href="${payload.imageUrl}" target="_blank" rel="noreferrer">Open Image</a>
      <button class="secondary-button" type="button" data-action="copy-image-url">Copy Image URL</button>
    </div>
    <small>Rendered with ${payload.model} at ${payload.size}.</small>
    ${payload.revisedPrompt ? `<details><summary>Revised prompt</summary><p>${payload.revisedPrompt}</p></details>` : ""}
  `;
};

const setImageStatus = (message, kind = "") => {
  const target = document.querySelector("#image-render-content");
  if (!target) return;
  target.className = `image-render-content ${kind}`.trim();
  target.textContent = message;
};

const buildSavedPayload = () => {
  const input = readForm();
  const result = buildPrompt(input, sliders);
  latestResult = result;
  renderOutput(result);
  return {
    id: editingPromptId,
    title: input.title,
    purpose: input.purpose,
    emotionalState: input.emotionalState,
    subject: input.subject,
    setting: input.setting,
    companions: input.companions,
    symbols: result.jsonPayload.symbols,
    colourNotes: input.colourNotes,
    extraNotes: input.extraNotes,
    aspectRatio: input.aspectRatio,
    outputType: input.outputType,
    sliders: { ...sliders },
    generatedPrompt: result.prompt,
    negativePrompt: result.negativePrompt,
    settings: result.settings,
    interpretedSummary: result.interpretedSummary,
    variants: result.variants,
  };
};

const applySliders = (nextSliders) => {
  sliders = { ...nextSliders };
  document.querySelectorAll("[data-slider]").forEach((input) => {
    input.value = sliders[input.dataset.slider];
    input.closest(".slider-row").querySelector("output").textContent = input.value;
  });
};

const renderSliders = () => {
  const container = document.querySelector("#slider-sections");
  container.innerHTML = SLIDER_SECTIONS.map(
    (section) => `
      <section class="slider-section">
        <h3>${section.title}</h3>
        ${section.sliders
          .map(
            (name) => `
              <label class="slider-row">
                <span>${name}</span>
                <input type="range" min="0" max="100" value="${sliders[name]}" data-slider="${name}" />
                <output>${sliders[name]}</output>
              </label>`
          )
          .join("")}
      </section>`
  ).join("");
};

const renderPresets = () => {
  const row = document.querySelector("#preset-row");
  row.innerHTML = Object.keys(PRESETS)
    .map((name) => `<button class="preset-button" type="button" data-preset="${name}">${name}</button>`)
    .join("");
};

const applyPresetNudge = (type) => {
  const next = { ...sliders };
  if (type === "make-softer") {
    next.Softness = Math.min(100, next.Softness + 15);
    next.Darkness = Math.max(0, next.Darkness - 10);
    next["Negative space"] = Math.min(100, next["Negative space"] + 10);
  }
  if (type === "make-sacred") {
    next.Mysticism = Math.min(100, next.Mysticism + 15);
    next["Sacred geometry"] = Math.min(100, next["Sacred geometry"] + 15);
    next["Halo intensity"] = Math.min(100, next["Halo intensity"] + 10);
  }
  if (type === "make-psychedelic") {
    next.Weirdness = Math.min(100, next.Weirdness + 15);
    next.Iridescence = Math.min(100, next.Iridescence + 15);
    next["Colour intensity"] = Math.min(100, next["Colour intensity"] + 15);
  }
  if (type === "sticker") {
    next["Focal clarity"] = 95;
    next["Background detail"] = 10;
    next["Ornament density"] = Math.min(45, next["Ornament density"]);
    next["Negative space"] = 80;
  }
  applySliders(next);
};

const generate = () => {
  latestResult = buildPrompt(readForm(), sliders);
  renderOutput(latestResult);
};

const renderStudio = (draft) => {
  app.innerHTML = "";
  app.onclick = null;
  app.oninput = null;
  app.appendChild(cloneTemplate("#studio-template"));
  fillSelect(document.querySelector("[name='purpose']"), PURPOSES);
  fillSelect(document.querySelector("[name='emotionalState']"), EMOTIONAL_STATES);
  fillSelect(document.querySelector("[name='companions']"), COMPANIONS);
  fillSelect(document.querySelector("[name='aspectRatio']"), ASPECT_RATIOS);
  fillSelect(document.querySelector("[name='outputType']"), OUTPUT_TYPES);
  renderPresets();
  renderSliders();
  if (draft) {
    editingPromptId = draft.id || null;
    sliders = { ...DEFAULT_SLIDERS, ...(draft.sliders || {}) };
    writeForm({
      title: draft.title,
      purpose: draft.purpose,
      emotionalState: draft.emotionalState,
      subject: draft.subject,
      setting: draft.setting,
      companions: draft.companions,
      symbols: Array.isArray(draft.symbols) ? draft.symbols.join(", ") : draft.symbols,
      colourNotes: draft.colourNotes,
      extraNotes: draft.extraNotes,
      aspectRatio: draft.aspectRatio,
      outputType: draft.outputType,
    });
    applySliders(sliders);
    generate();
  } else {
    editingPromptId = null;
  }

  document.querySelector("#prompt-form").addEventListener("submit", (event) => {
    event.preventDefault();
    generate();
  });

  document.querySelector("#combined-package-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = event.currentTarget.elements.includePromptPackage.checked;
    if (!selected) {
      document.querySelector("#combined-package-output").innerHTML =
        `<div class="empty-state">Select the prompt package checkbox before submitting.</div>`;
      return;
    }
    if (!latestResult) generate();
    renderCombinedPackage(latestResult);
  });

  app.oninput = (event) => {
    if (!event.target.matches("[data-slider]")) return;
    sliders[event.target.dataset.slider] = Number(event.target.value);
    event.target.closest(".slider-row").querySelector("output").textContent = event.target.value;
  };

  app.onclick = async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.action;
    if (button.dataset.preset) applySliders(PRESETS[button.dataset.preset]);
    if (action === "generate-variants") generate();
    if (action === "reset") applySliders(DEFAULT_SLIDERS);
    if (["make-softer", "make-sacred", "make-psychedelic", "sticker"].includes(action)) applyPresetNudge(action);
    if (action === "save") {
      const saved = savePrompt(buildSavedPayload());
      editingPromptId = saved.id;
      button.textContent = "Saved";
      setTimeout(() => (button.textContent = "Save Prompt"), 1200);
    }
    if (action === "export-json" && latestResult) {
      downloadText(`${titleCaseKey(readForm().title)}.json`, JSON.stringify(latestResult.jsonPayload, null, 2));
    }
    if (action === "render-image") {
      if (!latestResult) generate();
      button.disabled = true;
      button.textContent = "Rendering...";
      setImageStatus("Rendering through the secure local backend with gpt-image-2. This may take a moment.", "loading");
      try {
        renderImagePreview(await renderImageFromPrompt(latestResult));
      } catch (error) {
        setImageStatus(error.message, "error");
      } finally {
        button.disabled = false;
        button.textContent = "Render Image";
      }
    }
    if (action === "copy-image-url" && latestRenderedImage) {
      await copyText(latestRenderedImage.imageUrl, button);
    }
    if (button.dataset.copy && latestResult) {
      const map = {
        prompt: latestResult.prompt,
        negative: latestResult.negativePrompt,
        settings: settingsText(latestResult.settings),
      };
      await copyText(map[button.dataset.copy], button);
    }
    if (button.dataset.copyVariant && latestResult) {
      await copyText(latestResult.variants[Number(button.dataset.copyVariant)], button);
    }
    if (button.hasAttribute("data-copy-combined") && latestResult) {
      await copyText(combinedPackageText(latestResult), button);
    }
  };
};

const renderSaved = () => {
  app.innerHTML = "";
  app.onclick = null;
  app.oninput = null;
  app.appendChild(cloneTemplate("#saved-template"));
  const list = document.querySelector("#saved-list");
  const prompts = getSavedPrompts();
  if (!prompts.length) {
    list.innerHTML = `<div class="panel empty-state">No saved prompts yet. Create one in the Studio and save it here.</div>`;
    return;
  }
  list.innerHTML = prompts
    .map(
      (prompt) => `
        <article class="saved-card">
          <div>
            <p class="eyebrow">${prompt.purpose} · ${prompt.emotionalState}</p>
            <h2>${prompt.title}</h2>
            <p>${(prompt.generatedPrompt || "").slice(0, 220)}...</p>
            <small>Saved ${new Date(prompt.updatedAt).toLocaleString()}</small>
          </div>
          <div class="button-row">
            <a class="secondary-button link-button" href="#prompt/${prompt.id}">Open</a>
            <button class="secondary-button" type="button" data-duplicate="${prompt.id}">Duplicate</button>
            <button class="danger-button" type="button" data-delete="${prompt.id}">Delete</button>
          </div>
        </article>`
    )
    .join("");

  list.addEventListener("click", (event) => {
    const duplicate = event.target.closest("[data-duplicate]");
    const remove = event.target.closest("[data-delete]");
    if (duplicate) {
      duplicateSavedPrompt(duplicate.dataset.duplicate);
      renderSaved();
    }
    if (remove) {
      deleteSavedPrompt(remove.dataset.delete);
      renderSaved();
    }
  });
};

const renderPromptDetail = (id) => {
  app.onclick = null;
  app.oninput = null;
  const prompt = getSavedPromptById(id);
  if (!prompt) {
    app.innerHTML = `<section class="panel empty-state">Prompt not found. <a href="#saved">Return to saved prompts.</a></section>`;
    return;
  }
  app.innerHTML = `
    <section class="page-heading">
      <p class="eyebrow">${prompt.purpose} · ${prompt.emotionalState}</p>
      <h1>${prompt.title}</h1>
      <p class="subtitle">Prompt detail and local editing.</p>
      <div class="button-row">
        <button class="primary-button" type="button" id="edit-prompt">Edit and re-save in Studio</button>
        <button class="secondary-button" type="button" id="export-detail">Export JSON</button>
      </div>
    </section>
    <section class="output-layout">
      <article class="panel output-stack">
        <section class="output-block"><h3>Prompt</h3><p>${prompt.generatedPrompt}</p></section>
        <section class="output-block"><h3>Negative prompt</h3><p>${prompt.negativePrompt}</p></section>
        <section class="output-block"><h3>Settings</h3><pre>${settingsText(prompt.settings)}</pre></section>
        <section class="output-block"><h3>Interpreted style summary</h3><p>${prompt.interpretedSummary}</p></section>
      </article>
      <aside class="panel">
        <h2>Slider values</h2>
        <div class="slider-value-list">${Object.entries(prompt.sliders)
          .map(([key, value]) => `<span>${key}: <strong>${value}</strong></span>`)
          .join("")}</div>
      </aside>
    </section>
    <section class="panel variant-list">${prompt.variants
      .map((variant, index) => `<article class="variant-card"><h3>Variant ${index + 1}</h3><p>${variant}</p></article>`)
      .join("")}</section>
  `;

  document.querySelector("#edit-prompt").addEventListener("click", () => {
    window.location.hash = "studio";
    setTimeout(() => renderStudio(prompt), 0);
  });
  document.querySelector("#export-detail").addEventListener("click", () => {
    downloadText(`${titleCaseKey(prompt.title)}.json`, JSON.stringify(prompt, null, 2));
  });
};

const renderSimple = (templateId) => {
  app.innerHTML = "";
  app.onclick = null;
  app.oninput = null;
  app.appendChild(cloneTemplate(templateId));
  const exportAll = document.querySelector("#export-all");
  if (exportAll) exportAll.addEventListener("click", () => downloadText("beauty-alchemy-saved-prompts.json", exportSavedPrompts()));
};

const setActiveNav = (route) => {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === route);
  });
};

const route = () => {
  const hash = window.location.hash.replace(/^#/, "") || "studio";
  const [routeName, id] = hash.split("/");
  setActiveNav(routeName);
  if (routeName === "saved") renderSaved();
  else if (routeName === "prompt") renderPromptDetail(id);
  else if (routeName === "about") renderSimple("#about-template");
  else if (routeName === "settings") renderSimple("#settings-template");
  else renderStudio();
};

window.addEventListener("hashchange", route);
route();
