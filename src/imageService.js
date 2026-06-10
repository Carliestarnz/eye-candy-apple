export async function renderImageFromPrompt({ prompt, settings }) {
  const response = await fetch("/api/render-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      resolutionTarget: settings.resolutionTarget,
      quality: settings.quality?.includes("medium") ? "medium" : "high",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Image generation failed.");
  }
  return data;
}
