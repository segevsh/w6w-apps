import { webhookTrigger } from "../lib/triggers.ts";

/** A project created, updated or removed. */
const project = webhookTrigger({
  key: "project",
  title: "Project Event",
  description:
    "Fires when a project is created, updated or removed. The run gets the action, the project and, on an update, the values that changed.",
  resourceType: "Project",
  output: [
    { key: "data.name", type: "string", label: "Name" },
    { key: "data.state", type: "string", label: "State" },
    { key: "data.targetDate", type: "string", label: "Target date" },
  ],
  sampleData: {
    id: "3a1f9d2e-6b54-4c78-8e90-a1b2c3d4e5f6",
    name: "Reliable webhooks",
    state: "started",
    targetDate: "2026-12-31",
  },
});

export default project;
