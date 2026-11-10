import phoneNumberList from "../actions/phone-number-list.ts";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

export default pollFromListAction({
  key: "new-phone-number",
  title: "New Phone Number",
  description: "The run gets each newly created Vapi phone number.",
  action: phoneNumberList,
  input: () => ({ page: 1, limit: 100, sortBy: "createdAt", sortOrder: "DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Phone number ID" }],
  sample: { id: "pn_1", number: "+15551234567" },
  maxPages: 1,
});
