import { workflowSinceTrigger } from "../lib/triggers.ts";

export default workflowSinceTrigger({
  key: "new-or-updated-workflow",
  title: "New or Updated Workflow",
  description:
    "The run gets each workflow that is newly launched or updated (active ones unless a status is chosen).",
  stampField: "lastUpdated",
  idOf: (item) => {
    const w = item as { id?: unknown; lastUpdated?: unknown };
    return `${String(w.id ?? "")}:${String(w.lastUpdated ?? "")}`;
  },
  output: [
    { key: "id", type: "string", label: "Workflow ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "step", type: "string", label: "Current step" },
    { key: "status", type: "string", label: "Status" },
    { key: "lastUpdated", type: "string", label: "Last updated" },
  ],
  sample: {
    id: "6dac47a10b1242d1f7df688d",
    title: "Consulting Agreement",
    step: "Sign",
    status: "active",
    lastUpdated: "2026-11-10T10:00:00Z",
  },
});
