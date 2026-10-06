import { salesCreateAction } from "../lib/factory.ts";

/** `POST /v1/credit-notes[?finalize=true]` */
export default salesCreateAction({
  key: "credit-note-create",
  title: "Create Credit Note",
  noun: "a credit note",
  resource: "credit-note",
  path: "/credit-notes",
  required: "Required: voucherDate, address, lineItems, totalPrice.currency, " +
    "taxConditions.taxType.",
});
