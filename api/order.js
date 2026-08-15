import { nokos } from "./_nokos.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method harus POST",
    });
  }

  try {
    const {
      service,
      country = "6",
      operator = "",
      server = "s2",
    } = req.body || {};

    if (!service) {
      return res.status(400).json({
        success: false,
        message: "Service wajib dipilih",
      });
    }

    const idempotencyKey =
      req.headers["x-idempotency-key"] ||
      `nokos-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    const result = await nokos("getNumber", {
      method: "POST",
      body: {
        service,
        country,
        operator,
        server,
      },
      idempotencyKey,
    });

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
