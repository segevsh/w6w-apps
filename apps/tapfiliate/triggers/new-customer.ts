import type { TriggerDefinition } from "@w6w/types";
import customerList from "../actions/customer-list.ts";
import { pollDatedList } from "../lib/triggers.ts";

/**
 * `GET /customers/` has no sort order and only a day-granular `date_from` / `date_to`
 * (https://developers.tapfiliate.com/api-reference/customers/list-all-customers, 2026-11-10), so
 * the check is a since-filter poll (brief §9.1 b, §9.8, §9.9) — see `lib/triggers.ts`.
 */
const trigger: TriggerDefinition = {
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created customer.",
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "customer_id", type: "string", label: "Your customer id" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "affiliate", type: "object", label: "Referring affiliate" },
    { key: "program", type: "object", label: "Program" },
  ],
  sample: {
    id: "cu_eXampl3",
    customer_id: "USER123",
    status: "trial",
    created_at: "2026-11-09T12:00:00+00:00",
    affiliate: { id: "janejameson", firstname: "Jane", lastname: "Jameson" },
    program: { id: "johns-affiliate-program", title: "John's affiliate program", currency: "USD" },
  },
  minIntervalMs: 300_000,
  poll: pollDatedList(customerList),
};

export default trigger;
