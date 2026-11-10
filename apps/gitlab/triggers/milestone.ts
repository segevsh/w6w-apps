import { webhookTrigger } from "../lib/triggers.ts";

/** Milestone activity; `actions` narrows it (e.g. `close`). */
const milestone = webhookTrigger({
  key: "milestone",
  title: "Milestone Event",
  description:
    "Fires when a milestone is created, closed, reopened or deleted. The run gets the action and the milestone.",
  kind: "milestone",
  flag: "milestone_events",
  hasActions: true,
  output: [
    { key: "payload.object_attributes", type: "object", label: "Milestone" },
    { key: "payload.object_attributes.title", type: "string", label: "Title" },
    { key: "payload.object_attributes.state", type: "string", label: "State" },
  ],
  samplePayload: {
    object_kind: "milestone",
    action: "create",
    project: { path_with_namespace: "gitlab-org/gitlab-test" },
    object_attributes: { id: 61, title: "v1.0", state: "active", due_date: "2026-12-31" },
  },
});

export default milestone;
