import { getAction } from "../lib/factory.ts";

/** `GET /v1.0/receipts/{receipt_number}` — addressed by receipt NUMBER (e.g. 1-1001), not a uuid. */
export default getAction({
  key: "receipt-get",
  title: "Get Receipt",
  description: "Get one receipt by its receipt number.",
  resource: "receipt",
  path: "/receipts/{id}",
  idKey: "receiptNumber",
  idLabel: "Receipt number",
  outputKey: "receipt_number",
});
