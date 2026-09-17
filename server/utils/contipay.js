import axios from "axios";

const API_URL_DEV = "https://api2-test.contipay.co.zw";
const API_URL_LIVE = "https://api-v2.contipay.co.zw";

export async function initiatePayment({ amount, phone, provider, reference, description }) {
  try {
    const apiKey = process.env.CONTIPAY_API_KEY;
    const apiSecret = process.env.CONTIPAY_API_SECRET;
    const merchantId = Number(process.env.CONTIPAY_MERCHANT_CODE);
    const mode = (process.env.CONTIPAY_MODE || "DEV").toUpperCase();
    const webhookUrl = process.env.CONTIPAY_WEBHOOK_URL;

    if (!apiKey || !apiSecret || !merchantId) {
      throw new Error("ContiPay credentials missing in env");
    }

    const baseURL = mode === "LIVE" ? API_URL_LIVE : API_URL_DEV;

    const providerMap = {
      ecocash:  { name: "Ecocash",  code: "EC" },
      innbucks: { name: "InnBucks", code: "IB" },
      onemoney: { name: "OneMoney", code: "OM" },
    };
    const p = providerMap[String(provider).toLowerCase()];
    if (!p) throw new Error("Unsupported provider: " + provider);

    const payload = {
      customer: {
        nationalId: "-",
        firstName: phone,
        middleName: "-",
        surname: "-",
        email: phone + "@contipay.co.zw",
        cell: phone,
        countryCode: "ZW",
      },
      transaction: {
        providerCode: p.code,
        providerName: p.name,
        amount: Number(amount),
        currencyCode: "USD",
        description: description || ("Omnixra payment " + reference),
        webhookUrl,
        merchantId,
        reference,
      },
      accountDetails: {
        accountNumber: phone,
        accountName: "-",
        accountExtra: {
          smsNumber: phone,
          expiry: "122021",
          cvv: "003",
        },
      },
    };

    const res = await axios.post(baseURL + "/acquire/payment", payload, {
      auth: { username: apiKey, password: apiSecret },
      headers: { Accept: "application/json", "Content-type": "application/json" },
      timeout: 20000,
    });

    const data = res.data || {};
    return {
      success: true,
      statusCode: data.statusCode,
      status: data.status,
      message: data.message,
      transactionIndex: data?.transaction?.transactionIndex || null,
      contipayReference: data?.transaction?.transactionIndex
        ? String(data.transaction.transactionIndex)
        : null,
      providerResponse: data.providerResponse || null,
      raw: data,
    };
  } catch (error) {
    const body = error?.response?.data || {};
    console.error("[ContiPay] initiate error:", error.message, body);
    return {
      success: false,
      statusCode: body.statusCode || null,
      status: body.status || "ERROR",
      message: body.message || error.message,
      raw: body,
    };
  }
}

export function mapStatusCode(code) {
  const n = Number(code);
  if (n === 1) return "paid";
  if (n === 3) return "failed";
  if (n === 4) return "failed";
  if (n === 0) return "pending";
  if (n === 6) return "pending";
  return "pending";
}
