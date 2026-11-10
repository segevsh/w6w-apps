import { clientifyPoll } from "../lib/triggers.ts";
import dealList from "../actions/deal-list.ts";

export default clientifyPoll({
  key: "new-deal",
  title: "New Deal",
  description: "The run gets each newly created deal.",
  action: dealList,
  field: "created",
  withStamp: false,
  output: [
    { key: "id", type: "number", label: "Deal ID" },
    { key: "created", type: "string", label: "Created" },
    { key: "modified", type: "string", label: "Last modified" },
  ],
  sample: { id: 501, created: "2026-11-09T09:00:00Z", modified: "2026-11-09T09:30:00Z" },
});
