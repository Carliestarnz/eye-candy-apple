const band = (value, ranges) => {
  if (value <= 20) return ranges[0];
  if (value <= 40) return ranges[1];
  if (value <= 60) return ranges[2];
  if (value <= 80) return ranges[3];
  return ranges[4];
};

export const interpretSlider = (name, value) => {
  const maps = {
    Weirdness: [
      "grounded, gentle, familiar, lightly enchanted",
      "dreamy, soft, slightly surreal",
      "mystical, imaginative, otherworldly",
      "surreal, visionary, emotionally psychedelic",
      "highly symbolic, strange yet beautiful, cosmic dream-logic",
    ],
    Darkness: [
      "luminous, airy, bright, emotionally safe",
      "soft twilight, lightly moody, tender shadows",
      "moonlit, contemplative, shadow-kissed",
      "deep nocturnal atmosphere, mysterious, velvety",
      "sacred night energy, very moody, dark but still restorative",
    ],
    Sparkle: [
      "minimal sparkle, matte glow",
      "subtle shimmer",
      "visible sparkles and gentle glints",
      "rich halo accents, jewel-like highlights",
      "highly radiant, glittering focal accents and ornate luminous edges",
    ],
    Softness: [
      "crisp, graphic, defined edges",
      "gently softened",
      "balanced softness and detail",
      "dreamy, tender, velvety",
      "extremely soft, cloudlike, comforting, balm-like",
    ],
    Mysticism: [
      "lightly symbolic",
      "subtle spiritual atmosphere",
      "clear sacred symbolism",
      "devotional, ritual, spiritually charged",
      "deeply mystical, ceremonial, numinous, awe-filled",
    ],
    "Childlike wonder": [
      "mature, elegant, restrained",
      "gentle playfulness",
      "whimsical and sincere",
      "magical, innocent, emotionally open",
      "inner-child wonder, storybook enchantment, joyful awe",
    ],
  };

  if (maps[name]) return band(value, maps[name]);

  if (value <= 20) return `restrained ${name.toLowerCase()}`;
  if (value <= 40) return `subtle ${name.toLowerCase()}`;
  if (value <= 60) return `balanced ${name.toLowerCase()}`;
  if (value <= 80) return `strong ${name.toLowerCase()}`;
  return `intense ${name.toLowerCase()}`;
};

export const interpretSliders = (sliders) => ({
  vibe: [
    interpretSlider("Weirdness", sliders.Weirdness),
    interpretSlider("Darkness", sliders.Darkness),
    interpretSlider("Sparkle", sliders.Sparkle),
    interpretSlider("Softness", sliders.Softness),
    interpretSlider("Mysticism", sliders.Mysticism),
    interpretSlider("Childlike wonder", sliders["Childlike wonder"]),
  ],
  colour: [
    interpretSlider("Iridescence", sliders.Iridescence),
    interpretSlider("Bioluminescence", sliders.Bioluminescence),
    interpretSlider("Aura glow", sliders["Aura glow"]),
    interpretSlider("Pearlescence", sliders.Pearlescence),
    interpretSlider("Colour intensity", sliders["Colour intensity"]),
    interpretSlider("Sunset warmth", sliders["Sunset warmth"]),
    interpretSlider("Spectral rim light", sliders["Spectral rim light"]),
  ],
  ornament: [
    interpretSlider("Sacred geometry", sliders["Sacred geometry"]),
    interpretSlider("Floral filigree", sliders["Floral filigree"]),
    interpretSlider("Decorative linework", sliders["Decorative linework"]),
    interpretSlider("Cosmic symbolism", sliders["Cosmic symbolism"]),
    interpretSlider("Nature symbolism", sliders["Nature symbolism"]),
    interpretSlider("Yoni symbolism", sliders["Yoni symbolism"]),
    interpretSlider("Halo intensity", sliders["Halo intensity"]),
    interpretSlider("Ornament density", sliders["Ornament density"]),
  ],
  composition: [
    interpretSlider("Negative space", sliders["Negative space"]),
    interpretSlider("Focal clarity", sliders["Focal clarity"]),
    interpretSlider("Background detail", sliders["Background detail"]),
    interpretSlider("Companion presence", sliders["Companion presence"]),
    interpretSlider("Border decoration", sliders["Border decoration"]),
    interpretSlider("Symmetry", sliders.Symmetry),
    interpretSlider("Layered depth", sliders["Layered depth"]),
  ],
});

export const buildProtectiveDirectives = (sliders) => {
  const directives = [
    "Preserve a clear focal hierarchy and quiet luminous negative space around the central subject.",
    "Keep ornament purposeful and avoid busy detail directly behind faces or main subjects.",
  ];
  const avoid = [];

  if (sliders.Darkness > 60) {
    directives.push(
      "Use velvety sacred night, grief-softening atmosphere, mysterious but tender emotion, and emotionally safe shadows."
    );
    avoid.push("sinister", "terrifying", "evil", "violent", "demonic", "nightmare");
  }
  if (sliders.Sparkle > 60) {
    directives.push(
      "Controlled sparkle reserved for halos, rim light, focal accents, and border ornaments; shadow areas remain smooth, velvety, and low-noise."
    );
    avoid.push("full-image glitter noise");
  }
  if (sliders["Ornament density"] > 60) {
    directives.push(
      "Ornament concentrated in framing zones, clothing details, borders, halos, and symbolic accents, with quiet luminous space preserved around the face and central subject."
    );
    avoid.push("visual clutter behind the focal subject");
  }
  if (sliders["Background detail"] > 60) {
    directives.push("Background detail softly layered and lower contrast than the main subject.");
  }
  if (sliders.Weirdness > 60) {
    directives.push("Use emotionally safe surrealism, beautiful dream-logic, and strange but tender symbolism.");
    avoid.push("disturbing imagery", "grotesque imagery", "horror imagery");
  }
  if (sliders["Yoni symbolism"] > 60) {
    directives.push(
      "Yoni symbolism must remain abstract, floral, protective, symbolic, non-sexual, and life-giving."
    );
    avoid.push("explicit imagery", "sexualized imagery");
  }
  if (sliders["Companion presence"] > 60) {
    directives.push("Include exactly two small companion figures, smaller and secondary to the main subject.");
  }
  if (sliders["Negative space"] < 30) {
    directives.push("Even with denser composition, preserve some quiet luminous space around the central subject.");
  }

  return { directives, avoid };
};

export const summarizeStyle = (sliders) => {
  const parts = [
    interpretSlider("Weirdness", sliders.Weirdness),
    interpretSlider("Darkness", sliders.Darkness),
    interpretSlider("Softness", sliders.Softness),
    interpretSlider("Aura glow", sliders["Aura glow"]),
    interpretSlider("Ornament density", sliders["Ornament density"]),
    interpretSlider("Negative space", sliders["Negative space"]),
  ];
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("; ") + ".";
};
