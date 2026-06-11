import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = resolve(".");
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
};

const sendJson = (response, status, payload) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
};

const normalizeSize = (resolutionTarget) => {
  const firstSize = String(resolutionTarget || "2048x2048").split(" or ")[0];
  return ["2048x2048", "2048x1152", "3840x2160", "2160x3840"].includes(firstSize)
    ? firstSize
    : "2048x2048";
};

const readOpenAiKey = async () => {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const envText = await readFile(join(root, ".env"), "utf8");
    const keyLine = envText.split(/\r?\n/).find((line) => /^\s*OPENAI_API_KEY\s*=/.test(line));
    return keyLine ? keyLine.replace(/^\s*OPENAI_API_KEY\s*=\s*/, "").trim().replace(/^[\'"]|[\'"]$/g, "") : "";
  } catch {
    return "";
  }
};

const extractImage = (data) => {
  const image = data?.data?.[0];
  if (image?.b64_json) return `data:image/png;base64,${image.b64_json}`;
  if (image?.url) return image.url;
  return null;
};

const renderImage = async (request, response) => {
  const openAiKey = await readOpenAiKey();
  if (!openAiKey) {
    sendJson(response, 500, {
      error:
        "OPENAI_API_KEY is not set for the local server. Restart the server with that environment variable to render images.",
    });
    return;
  }

  const body = JSON.parse(await readBody(request));
  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    sendJson(response, 400, { error: "Prompt is required." });
    return;
  }

  const apiResponse = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt,
      size: normalizeSize(body.resolutionTarget),
      quality: body.quality === "low" || body.quality === "medium" ? body.quality : "high",
    }),
  });

  const data = await apiResponse.json();
  if (!apiResponse.ok) {
    sendJson(response, apiResponse.status, {
      error: data?.error?.message || "OpenAI image generation failed.",
      details: data,
    });
    return;
  }

  const imageUrl = extractImage(data);
  if (!imageUrl) {
    sendJson(response, 502, { error: "OpenAI response did not include an image.", details: data });
    return;
  }

  sendJson(response, 200, {
    imageUrl,
    model: "gpt-image-2",
    size: normalizeSize(body.resolutionTarget),
    revisedPrompt: data?.data?.[0]?.revised_prompt || null,
  });
};

const serveStatic = async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  if (pathname === "/favicon.ico") {
    response.writeHead(204, { "Cache-Control": "no-store" });
    response.end();
    return;
  }
  const filePath = resolve(join(root, pathname === "/" ? "index.html" : pathname));
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
};

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    if (request.method === "POST" && pathname === "/api/render-image") {
      await renderImage(request, response);
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error." });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Beauty Alchemy Prompt Studio: http://127.0.0.1:${port}/`);
});
