import { buildProtectiveDirectives, interpretSliders, summarizeStyle } from "./sliderInterpreter.js";

const NEGATIVE_BASE = [
  "horror",
  "grimdark",
  "cynical",
  "ironic",
  "harsh expression",
  "muddy colour",
  "cluttered background",
  "excessive sparkle noise",
  "busy detail behind focal subject",
  "distorted anatomy",
  "extra limbs",
  "malformed hands",
  "harsh lighting",
  "aggressive rave aesthetic",
  "corporate wellness aesthetic",
  "beige minimalism",
  "sexualized sacred feminine imagery",
  "living artist style imitation",
  "sinister mood",
  "noisy star texture",
  "glitter covering the whole image",
  "lifeless expression",
  "illegible symbols",
  "generic fantasy wallpaper",
  "plastic skin",
  "over-sharpened noise",
  "low resolution",
  "blurry focal subject",
  "watermark",
];

const resolutionMap = {
  Square: "2048x2048",
  Portrait: "2160x3840",
  Landscape: "2048x1152 or 3840x2160",
  "Website hero": "3840x2160",
  Poster: "2160x3840",
  "Sticker/Icon": "2048x2048",
  "Mobile wallpaper": "2160x3840",
  "Desktop wallpaper": "3840x2160",
};

const splitSymbols = (symbols) =>
  symbols
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);

export const getResolutionTarget = (aspectRatio) => resolutionMap[aspectRatio] || "2048x2048";

export const getStyleStrength = (sliders) => {
  if (
    sliders.Weirdness >= 75 &&
    sliders["Ornament density"] >= 70 &&
    sliders["Colour intensity"] >= 75 &&
    sliders["Cosmic symbolism"] >= 70
  ) {
    return "maximal";
  }
  if (sliders["Colour intensity"] >= 65 && sliders["Aura glow"] >= 65 && sliders.Mysticism >= 65) {
    return "vivid";
  }
  if (sliders.Weirdness <= 35 && sliders["Colour intensity"] <= 45 && sliders.Softness >= 70) {
    return "gentle";
  }
  return "balanced";
};

const getCompanionInstruction = (input, sliders) => {
  if (input.companions === "None" && sliders["Companion presence"] <= 60) {
    return "No companion figures; keep one clear central subject.";
  }
  if (input.companions === "Focal trio energy" || sliders["Companion presence"] > 60 || input.companions !== "None") {
    return `Include exactly two small companion figures inspired by ${input.companions.toLowerCase()}, both secondary to the central subject, each with a readable silhouette and small halo of calm space.`;
  }
  return "Companions are optional and should remain very subtle if included.";
};

const mediumForPurpose = (purpose) => {
  if (purpose.includes("Oracle")) return "polished oracle-card fantasy illustration";
  if (purpose.includes("Website")) return "immersive website hero image";
  if (purpose.includes("Sticker")) return "clean sticker/icon prompt with crisp silhouette";
  if (purpose.includes("Poster")) return "high-resolution poster illustration";
  if (purpose.includes("Album")) return "album-cover dream artwork";
  if (purpose.includes("Pattern")) return "ornamental repeating pattern concept";
  return "high-resolution transformational dream art";
};

const settingText = (input) =>
  input.setting || "a luminous sentient sanctuary where nature feels spiritually communicative";

const subjectText = (input) =>
  input.subject || "one tender central figure holding a quiet inner light, emotionally open and restored";

const colourText = (input, interpreted) =>
  input.colourNotes
    ? `${input.colourNotes}, with ${interpreted.colour.join(", ")}`
    : `luminous teal, aquatic blue, cosmic purple, pearlescent white, sunset-spectrum gold, and ${interpreted.colour.join(", ")}`;

const buildPromptText = (input, sliders, variantTone = "") => {
  const interpreted = interpretSliders(sliders);
  const { directives } = buildProtectiveDirectives(sliders);
  const symbols = splitSymbols(input.symbols);
  const motifs = symbols.length
    ? symbols.slice(0, 6).join(", ")
    : "moonlit flowers, cosmic halos, flowing botanical curves, sacred geometry";
  const companionInstruction = getCompanionInstruction(input, sliders);

  return [
    `${mediumForPurpose(input.purpose)} of ${subjectText(input)} in a ${input.emotionalState.toLowerCase()} inner state${variantTone ? `, ${variantTone}` : ""}.`,
    `Set within ${settingText(input)}, a luminous environment that feels alive, sentient, and spiritually communicative.`,
    `Feature ${motifs} as purposeful symbolic ingredients, using art nouveau curves, Celtic-like flow, floral filigree, sacred geometry, cosmic halos, embroidered symbolism, and decorative linework.`,
    `Colour and light: ${colourText(input, interpreted)}; make glow communicate emotion, with the warmest light carried by the focal subject.`,
    `Composition: ${companionInstruction} Clear central emotional anchor, quiet luminous gradients around the central subject and companions, dense ornament pushed toward borders, corners, halos, clothing, and framing zones, uncluttered background directly behind faces and silhouettes.`,
    `Aesthetic: ${interpreted.vibe.join(", ")}; tender, hopeful, enchanted, emotionally expansive, spiritually charged, restorative, sincere, psychedelic but emotionally safe, magical without chaos.`,
    `Sparkle and shadow discipline: controlled sparkle reserved for rim light, halos, focal accents, selected flowers, and border ornaments; smooth velvety low-sparkle shadow areas with deep aquatic blue, cosmic purple, soft indigo, or muted teal gradients.`,
    directives.join(" "),
    `Finish: ultra-detailed but coherent, crisp focal subject, clean expressive face and graceful anatomy when figures are present, coherent lighting, luminous layered depth, finely rendered textures, print-quality gallery finish.`,
    input.extraNotes ? `User notes: ${input.extraNotes}` : "",
  ]
    .filter(Boolean)
    .join(" ");
};

export const buildPrompt = (input, sliders) => {
  const { avoid } = buildProtectiveDirectives(sliders);
  const settings = {
    backend: "OpenAI GPT Image / ChatGPT Images",
    model: "gpt-image-2 for Image API, or latest ChatGPT mainline model with image_generation tool",
    aspectRatio: input.aspectRatio,
    resolutionTarget: getResolutionTarget(input.aspectRatio),
    quality: input.outputType === "API payload draft" ? "medium for drafts, high for final assets" : "high for final assets",
    styleStrength: getStyleStrength(sliders),
    notes:
      "MVP prompt-only output. For real generation, send this prompt through a secure backend or API route so no API key is exposed in the browser.",
  };

  const prompt = buildPromptText(input, sliders);
  const negativePrompt = [...new Set([...NEGATIVE_BASE, ...avoid])].join(", ");
  const interpretedSummary = summarizeStyle(sliders);
  const variants = [
    buildPromptText(input, { ...sliders, Softness: Math.min(100, sliders.Softness + 15), Darkness: Math.max(0, sliders.Darkness - 10) }, "softer and more restorative, with extra balm-like luminous calm"),
    buildPromptText(input, { ...sliders, Mysticism: Math.min(100, sliders.Mysticism + 20), "Sacred geometry": Math.min(100, sliders["Sacred geometry"] + 20) }, "more mystical and symbolic, with ceremonial sacred geometry and devotional awe"),
    buildPromptText(input, { ...sliders, Weirdness: Math.min(100, sliders.Weirdness + 20), "Colour intensity": Math.min(100, sliders["Colour intensity"] + 20), Iridescence: Math.min(100, sliders.Iridescence + 20) }, "more vivid and psychedelic, with emotionally safe dream-logic and blooming iridescent colour"),
  ];

  const jsonPayload = {
    title: input.title,
    purpose: input.purpose,
    emotionalState: input.emotionalState,
    subject: input.subject,
    setting: input.setting,
    companions: input.companions,
    symbols: splitSymbols(input.symbols),
    colourNotes: input.colourNotes,
    aspectRatio: input.aspectRatio,
    resolutionTarget: settings.resolutionTarget,
    quality: settings.quality,
    styleStrength: settings.styleStrength,
    sliders,
    prompt,
    negativePrompt,
    variants,
    notes: settings.notes,
  };

  return { prompt, negativePrompt, settings, interpretedSummary, variants, jsonPayload };
};
