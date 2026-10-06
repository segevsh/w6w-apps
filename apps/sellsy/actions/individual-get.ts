import { getAction } from "../lib/actions.ts";

export default getAction({
  "key": "individual-get",
  "noun": "individual",
  "path": "/individuals",
  "scope": "individuals.read",
  "resultKey": "individual",
  "embeds": [
    "invoicing_address",
    "delivery_address",
    "main_contact",
    "smart_tags",
    "owner",
  ],
});
