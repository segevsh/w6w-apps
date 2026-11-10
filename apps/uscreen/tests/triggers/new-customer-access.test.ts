import trigger from "../../triggers/new-customer-access.ts";
import { sinceSuite } from "./_suite.ts";

sinceSuite(
  "new-customer-access",
  trigger,
  "https://uscreen.io/publisher_api/v1/customers/42/accesses",
  "created_at",
  {
    params: { customerId: "42" },
    dateField: false,
  },
);
