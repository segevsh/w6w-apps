import { pollFromListAction } from "../../_shared/poll/mod.ts";
import leadList from "../actions/lead-list.ts";

export default pollFromListAction({
  key: "new-lead",
  title: "New Lead",
  description: "Fires when a new lead is created in Kommo.",
  action: leadList,
  input: () => ({ orderBy: "created_at", orderDirection: "desc", page: 1, limit: 100 }),
  items: (result) => (result as { leads?: unknown[] }).leads ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Lead ID" }],
  sample: { id: "lead_123" },
});
