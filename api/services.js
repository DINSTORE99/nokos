import { nokos } from "./_nokos.js";

export default async function handler(req, res) {
  try {
    const result = await nokos("getServices");

    res.status(200).json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
