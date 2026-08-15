const BASE_URL = "https://nokos.co.id/api/";

export async function nokos(action, options = {}) {
  const {
    method = "GET",
    params = {},
    body = null,
    idempotencyKey = null,
  } = options;

  const url = new URL(BASE_URL);
  url.searchParams.set("action", action);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const headers = {
    "X-API-Key": process.env.NOKOS_API_KEY,
  };

  if (body) {
    headers["Content-Type"] =
      "application/x-www-form-urlencoded;charset=UTF-8";
  }

  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = idempotencyKey;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? new URLSearchParams(body).toString() : undefined,
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`NOKOS mengembalikan response bukan JSON: ${text}`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data?.message ||
      data?.error ||
      `NOKOS API error (${response.status})`
    );
  }

  return data;
}
