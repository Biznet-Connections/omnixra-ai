import { createRequire } from "module";
const require = createRequire(import.meta.url);
const axios = require("axios");

const token = "RFNzQXk3S2RaM2R1aW0rck8rRVZpZz09";
const secret = "19c77dc3-8178-48a3-b3a4-69a1eda02e35";

const payload = {
  customer: {
    nationalId: "-",
    firstName: "0771234567",
    middleName: "-",
    surname: "-",
    email: "0771234567@contipay.co.zw",
    cell: "0771234567",
    countryCode: "ZW"
  },
  transaction: {
    providerCode: "EC",
    providerName: "Ecocash",
    amount: 1,
    currencyCode: "USD",
    description: "Omnixra DEV test",
    webhookUrl: "https://omnixra-ai.com/api/payments/contipay/webhook",
    merchantId: 1339,
    reference: "TEST-" + Date.now()
  },
  accountDetails: {
    accountNumber: "0771234567",
    accountName: "-",
    accountExtra: { smsNumber: "0771234567", expiry: "122021", cvv: "003" }
  }
};

try {
  const res = await axios.post(
    "https://api2-test.contipay.co.zw/acquire/payment",
    payload,
    {
      auth: { username: token, password: secret },
      headers: { Accept: "application/json", "Content-type": "application/json" }
    }
  );
  console.log("SUCCESS:");
  console.log(JSON.stringify(res.data, null, 2));
} catch (err) {
  console.log("STATUS:", err.response?.status);
  console.log("BODY:");
  console.log(JSON.stringify(err.response?.data, null, 2));
}
