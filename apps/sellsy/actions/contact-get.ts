import { getAction } from "../lib/actions.ts";

export default getAction({
  "key": "contact-get",
  "noun": "contact",
  "path": "/contacts",
  "scope": "contacts.read",
  "resultKey": "contact",
  "embeds": [
    "invoicing_address",
    "delivery_address",
    "opportunities",
    "smart_tags",
    "owner",
  ],
});
