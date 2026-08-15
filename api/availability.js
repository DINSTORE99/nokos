import { nokos } from "./_nokos.js";

export default async function handler(req, res) {
  try {
    const {
      service,
      country = "6",
      server = "s2",
    } = req.query;

    if (!service) {
      return res.status(400).json({
        success: false,
        message: "Parameter service wajib diisi",
      });
    }

    const result = await nokos("getAvailability", {
      params: {
        service,
        country,
        server,
      },
    });

    const apiPrice = Number(result.data?.price || 0);
    const stock = Number(result.data?.available || 0);

    res.status(200).json({
      success: true,
      data: {
        available: stock,
        api_price: apiPrice,
        markup: MARKUP,
        sell_price: apiPrice + MARKUP,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

const MARKUP = 1000;
