import { clientifyPoll } from "../lib/triggers.ts";
import dealList from "../actions/deal-list.ts";

export default clientifyPoll({
  key: "new-or-updated-deal",
  title: "New or Updated Deal",
  description: "The run gets each deal that is created or edited, once per edit.",
  action: dealList,
  field: "modified",
  withStamp: true,
  output: [
    { key: "id", type: "number", label: "Deal ID" },
    { key: "created", type: "string", label: "Created" },
    { key: "modified", type: "string", label: "Last modified" },
  ],
  sample: { id: 501, created: "2026-11-09T09:00:00Z", modified: "2026-11-09T09:30:00Z" },
});
