import type { ActionDefinition } from "@w6w/types";
import { GrafanaClient } from "../lib/client.ts";

interface Input {
  text: string;
  dashboardUid?: string;
  panelId?: number;
  time?: number;
  timeEnd?: number;
  tags?: string;
}

/**
 * `POST /api/annotations` — confirmed against Grafana's own Annotations HTTP
 * API docs. `dashboardUID`/`panelId` scope the annotation to a specific
 * dashboard/panel; omit both for a global (org-wide) annotation. `timeEnd`
 * set alongside `time` creates a region annotation instead of a point one.
 */
const annotationCreate: ActionDefinition<Input> = {
  key: "annotation-create",
  type: "perform",
  resource: "annotation",
  title: "Create Annotation",
  description:
    "Add an annotation, optionally scoped to a dashboard/panel or spanning a time range.",
  idempotent: false,
  params: [
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "dashboardUid",
      label: "Dashboard UID",
      type: "string",
      hint: "Scope the annotation to one dashboard. Leave empty for a global annotation.",
    },
    {
      key: "panelId",
      label: "Panel ID",
      type: "number",
      hint: "Scope the annotation to one panel. Requires Dashboard UID.",
    },
    { key: "time", label: "Time (epoch ms)", type: "number", hint: "Defaults to now." },
    {
      key: "timeEnd",
      label: "End time (epoch ms)",
      type: "number",
      hint: "Set alongside Time to create a region annotation instead of a point one.",
    },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated list of tags." },
  ],
  output: [
    { key: "id", type: "number", label: "Annotation ID" },
    { key: "message", type: "string", label: "Result message" },
  ],

  execute(input, ctx) {
    const client = GrafanaClient.fromConnection(ctx);
    return client.request("/annotations", {
      method: "POST",
      body: {
        text: input.text,
        dashboardUID: input.dashboardUid,
        panelId: input.panelId,
        time: input.time,
        timeEnd: input.timeEnd,
        tags: input.tags ? input.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      },
    });
  },
};

export default annotationCreate;
