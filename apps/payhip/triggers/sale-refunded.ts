import { normalizeSale, SALE_OUTPUT, webhookTrigger } from "../lib/triggers.ts";

/** A payment is refunded (Payhip event `refunded`). */
const saleRefunded = webhookTrigger({
  key: "sale-refunded",
  title: "Sale Refunded",
  description:
    "Fires when a Payhip payment is refunded. The run gets the transaction id, the amount refunded (equal to the price for a full refund) and when it was created and refunded.",
  type: "refunded",
  output: SALE_OUTPUT,
  normalize: normalizeSale,
  sample: {
    type: "refunded",
    transactionId: "ZGjVj5x4GN",
    email: "buyer@example.com",
    currency: "USD",
    price: 900,
    items: [{ product_id: "2804256", product_name: "Sample Product", quantity: "1" }],
    paymentType: "card",
    date: 1762768800,
    amountRefunded: 900,
    dateRefunded: 1762769000,
    dateCreated: 1762768800,
  },
});

export default saleRefunded;
