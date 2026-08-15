import { nokos } from "./_nokos.js";

const MARKUP = 1000;

export default async function handler(req, res) {
  try {
    const {
      service = "",
      country = "6",
      server = "s2",
    } = req.query;

    const result = await nokos("getPrices", {
      params: {
        service,
        country,
        server,
      },
    });

    const data = result.data || {};

    const formatted = {};

    for (const [countryId, services] of Object.entries(data)) {
      formatted[countryId] = {};

      for (const [serviceCode, item] of Object.entries(services || {})) {
        const apiPrice = Number(item?.cost || 0);
        const stock = Number(item?.count || 0);

        formatted[countryId][serviceCode] = {
          api_price: apiPrice,
          markup: MARKUP,
          sell_price: apiPrice + MARKUP,
          stock,
        };
      }
    }

    res.status(200).json({
      success: true,
      markup: MARKUP,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
