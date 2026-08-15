import { nokos } from "./_nokos.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method harus POST",
    });
  }

  try {
    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID aktivasi wajib diisi",
      });
    }

    const result = await nokos("cancelActivation", {
      method: "POST",
      body: {
        id,
      },
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
