import { workflowSinceTrigger } from "../lib/triggers.ts";

export default workflowSinceTrigger({
  key: "new-workflow",
  title: "New Workflow",
  description: "The run gets each newly launched workflow (active ones unless a status is chosen).",
  stampField: "created",
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Workflow ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "template", type: "string", label: "Template ID" },
    { key: "step", type: "string", label: "Current step" },
    { key: "status", type: "string", label: "Status" },
    { key: "created", type: "string", label: "Created at" },
  ],
  sample: {
    id: "6dac47a10b1242d1f7df688d",
    title: "Consulting Agreement",
    template: "template-1",
    step: "Review",
    status: "active",
    created: "2026-11-10T09:00:00Z",
  },
});
