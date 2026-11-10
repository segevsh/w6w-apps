import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listPhoneNumbers from "../actions/list-phone-numbers.ts";

/**
 * Wraps `list-phone-numbers` (`GET /phone_numbers`). Telnyx documents the default order of that
 * list: "If not given, results are sorted by created_at in descending order", so page 1 without a
 * `sort` is the newest-first feed.
 * https://github.com/team-telnyx/openapi (`spec3.json`, `GET /phone_numbers`, parameter `sort`).
 */
export default pollFromListAction({
  key: "new-phone-number",
  title: "New Phone Number",
  description: "The run gets each phone number newly added to the Telnyx account.",
  action: listPhoneNumbers,
  input: () => ({ pageSize: 100, pageNumber: 1 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Phone number ID" },
    { key: "phone_number", type: "string", label: "Phone number (E.164)" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "1293384261075731499",
    phone_number: "+13125550100",
    status: "active",
    created_at: "2026-11-09T12:00:00Z",
  },
  maxPages: 1,
});
