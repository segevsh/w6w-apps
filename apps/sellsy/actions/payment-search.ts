import { searchAction } from "../lib/actions.ts";

export default searchAction({
  "key": "payment",
  "noun": "payments",
  "path": "/payments",
  "scope": "payments.read",
  "orders": [
    "id",
    "paid_date",
  ],
  "embeds": [
    "company",
    "individual",
  ],
  "filters": [
    {
      "key": "status",
      "label": "Statuses",
      "as": "strList",
      "hint": "Comma-separated: pending, confirmed, rejected, failed, refund.",
    },
  ],
});
