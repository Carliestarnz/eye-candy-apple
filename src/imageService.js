export async function renderImageFromPrompt({ prompt, settings }) {
  let response;
  try {
    response = await fetch("/api/render-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        resolutionTarget: settings.resolutionTarget,
        quality: settings.quality?.includes("medium") ? "medium" : "high",
      }),
    });
  } catch {
    throw new Error("The local image server is not reachable. Restart the app server, refresh the page, then render again.");
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      response.status === 404
        ? "The local image endpoint is not running. Restart the app server with server.mjs, then try Render Image again."
        : `Image endpoint returned a non-JSON response: ${text.slice(0, 120)}`
    );
  }
  if (!response.ok) {
    const detail = data.details?.error?.code ? ` (${data.details.error.code})` : "";
    throw new Error(`${data.error || "Image generation failed."}${detail}`);
  }
  return data;
}
