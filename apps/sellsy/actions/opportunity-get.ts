import { getAction } from "../lib/actions.ts";

export default getAction({
  "key": "opportunity-get",
  "noun": "opportunity",
  "path": "/opportunities",
  "scope": "opportunities.read",
  "resultKey": "opportunity",
  "embeds": [
    "estimates",
    "individual",
    "invoices",
    "orders",
    "deliveries",
    "company",
    "contacts",
    "assigned_staffs",
  ],
});
