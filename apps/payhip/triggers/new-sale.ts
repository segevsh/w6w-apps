import { normalizeSale, SALE_OUTPUT, webhookTrigger } from "../lib/triggers.ts";

/** A customer is charged (Payhip event `paid`). */
const newSale = webhookTrigger({
  key: "new-sale",
  title: "New Sale",
  description:
    "Fires when a customer is charged on Payhip (the `paid` event). The run gets the transaction id, buyer email, amount in minor units, currency and the purchased items.",
  type: "paid",
  output: SALE_OUTPUT,
  normalize: normalizeSale,
  sample: {
    type: "paid",
    transactionId: "ZGjVj5x4GN",
    email: "buyer@example.com",
    currency: "USD",
    price: 900,
    items: [{ product_id: "2804256", product_name: "Sample Product", quantity: "1" }],
    paymentType: "card",
    date: 1762768800,
    amountRefunded: null,
    dateRefunded: null,
    dateCreated: null,
  },
});

export default newSale;
