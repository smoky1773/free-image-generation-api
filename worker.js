export default {
  async fetch(request, env) {
    // =========================
    // 1. Check API key
    // =========================

    const configuredKey = String(env.API_KEY || "").trim();

    const authorization =
      request.headers.get("Authorization") || "";

    const receivedKey = authorization
      .replace(/^Bearer\s+/i, "")
      .trim();

    if (!configuredKey) {
      return json(
        { error: "API_KEY secret is not configured in Cloudflare." },
        500
      );
    }

    if (!receivedKey || receivedKey !== configuredKey) {
      return json(
        { error: "Unauthorized" },
        401
      );
    }

    // =========================
    // 2. Only allow POST /
    // =========================

    const url = new URL(request.url);

    if (request.method !== "POST" || url.pathname !== "/") {
      return json(
        { error: "Only POST requests to / are allowed." },
        405
      );
    }

    // =========================
    // 3. Read prompt
    // =========================

    try {
      const body = await request.json();

      const prompt =
        typeof body.prompt === "string"
          ? body.prompt.trim()
          : "";

      if (!prompt) {
        return json(
          { error: "Prompt is required." },
          400
        );
      }

      // =========================
      // 4. Generate image
      // =========================

      const result = await env.AI.run(
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        {
          prompt: prompt
        }
      );

      // =========================
      // 5. Return image
      // =========================

      return new Response(result, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-store"
        }
      });

    } catch (error) {
      return json(
        {
          error: "Failed to generate image.",
          details: error.message
        },
        500
      );
    }
  }
};


// =========================
// JSON response helper
// =========================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status: status,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
