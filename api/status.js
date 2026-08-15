import { nokos } from "./_nokos.js";

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID aktivasi wajib diisi",
      });
    }

    const result = await nokos("getStatus", {
      params: {
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
