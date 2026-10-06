import { getAction } from "../lib/actions.ts";

export default getAction({
  "key": "invoice-get",
  "noun": "invoice",
  "path": "/invoices",
  "scope": "invoices.read",
  "resultKey": "invoice",
});
