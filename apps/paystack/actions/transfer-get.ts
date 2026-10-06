import { getAction } from "../lib/factory.ts";

/** `GET /transfer/{code}`. */
export default getAction({
  key: "transfer-get",
  title: "Get Transfer",
  description: "Fetch a transfer by code or numeric id and read its `status`.",
  resource: "transfer",
  path: "/transfer/{id}",
  idLabel: "Transfer code",
  idHint: "e.g. TRF_1ptvuv321ahaa7q",
  output: [
    { key: "transfer_code", type: "string", label: "Transfer code" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "recipient", type: "object", label: "Recipient" },
  ],
});
