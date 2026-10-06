import { getAction } from "../lib/actions.ts";

export default getAction({
  "key": "company-get",
  "noun": "company",
  "path": "/companies",
  "scope": "companies.read",
  "resultKey": "company",
  "embeds": [
    "invoicing_address",
    "delivery_address",
    "main_contact",
    "opportunities",
    "smart_tags",
    "owner",
  ],
});
