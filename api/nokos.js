const API_URL = process.env.NOKOS_API_URL || "https://nokos.co.id/api/";
const API_KEY = process.env.NOKOS_API_KEY;

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (!API_KEY) {
    return json(res, 500, {
      success: false,
      error: "NOKOS_API_KEY belum dikonfigurasi di Vercel."
    });
  }

  try {
    const url = new URL(API_URL);
    for (const [key, value] of Object.entries(req.query || {})) {
      if (key !== "apiKey" && value !== undefined) url.searchParams.set(key, value);
    }

    const method = (req.method || "GET").toUpperCase();
    const headers = {
      "X-API-Key": API_KEY,
      "Accept": "application/json"
    };

    let body;

    if (method !== "GET" && method !== "HEAD") {
      const contentType = req.headers["content-type"] || "application/x-www-form-urlencoded";
      headers["Content-Type"] = contentType;

      if (contentType.includes("application/json")) {
        body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
      } else {
        const params = new URLSearchParams();
        const source = req.body || {};
        for (const [key, value] of Object.entries(source)) {
          if (value !== undefined && value !== null) params.append(key, String(value));
        }
        body = params.toString();
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }

      const idem = req.headers["x-idempotency-key"] || req.headers["idempotency-key"];
      if (idem) headers["X-Idempotency-Key"] = idem;
    }

    const upstream = await fetch(url.toString(), {
      method,
      headers,
      body
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, error: "Response API NOKOS bukan JSON.", raw: text.slice(0, 1000) };
    }

    return json(res, upstream.status, data);
  } catch (error) {
    return json(res, 500, {
      success: false,
      error: error.message || "Gagal menghubungi API NOKOS."
    });
  }
}
