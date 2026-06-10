/*
  Future OpenAI image service placeholder.

  Do not put API keys in frontend/browser code.
  Real image generation must happen through a secure backend, server action,
  API route, or serverless function that keeps credentials private.

  The app now includes a local backend endpoint at /api/render-image.
  Keep production image generation server-side for the same reason.
*/

export async function generateImageFromPrompt({ prompt, settings }) {
  const response = await fetch("/api/render-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      resolutionTarget: settings?.resolutionTarget,
      quality: settings?.quality?.includes("medium") ? "medium" : "high",
    }),
  });
  return response.json();
}

export async function editImageWithReference() {
  throw new Error("Reference editing must be implemented in a secure backend/API route.");
}

export async function generatePromptVariants() {
  throw new Error("Variant generation through an API must be implemented securely server-side.");
}

export function createImageApiPayload({ prompt, settings }) {
  return {
    model: "gpt-image-2",
    prompt,
    size: settings?.resolutionTarget,
    quality: "high",
  };
}
