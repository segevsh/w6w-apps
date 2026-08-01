import type { ActionDefinition } from "@w6w/types";
import { GrafanaClient } from "../lib/client.ts";

interface Input {
  dashboard: Record<string, unknown>;
  folderUid?: string;
  overwrite?: boolean;
  message?: string;
}

/**
 * `POST /api/dashboards/db` — Grafana's single create-or-update endpoint,
 * confirmed against Grafana's own Dashboard HTTP API docs. Whether it
 * creates or updates depends entirely on the `dashboard` body: omit `id`/
 * `uid` (or set them `null`) to create a new one; include an existing `uid`
 * with `overwrite: true` to replace it in place.
 *
 * Only the "replace an existing uid with overwrite" form is safe to retry —
 * a bare create re-run without `overwrite` produces a second dashboard (or a
 * 412 conflict if the title collides) — so the action stays
 * `idempotent: false` overall, an honest reflection of its worst case rather
 * than its best.
 */
const dashboardCreateUpdate: ActionDefinition<Input> = {
  key: "dashboard-create-update",
  type: "perform",
  resource: "dashboard",
  title: "Create or Update Dashboard",
  description: "Create a new dashboard, or overwrite an existing one by UID.",
  idempotent: false,
  params: [
    {
      key: "dashboard",
      label: "Dashboard JSON",
      type: "json",
      required: true,
      hint: "Full dashboard model. Omit `id`/`uid` (or set them null) to create a new " +
        "dashboard; include an existing `uid` with Overwrite enabled to replace it.",
    },
    {
      key: "folderUid",
      label: "Folder UID",
      type: "string",
      hint: "Folder to save the dashboard into. Leave empty for the General folder.",
    },
    {
      key: "overwrite",
      label: "Overwrite",
      type: "boolean",
      default: false,
      hint: "Required to replace an existing dashboard's version, or to bypass the " +
        "same-title-in-folder conflict check.",
    },
    {
      key: "message",
      label: "Commit message",
      type: "string",
      hint: "Recorded on the dashboard's version history.",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "Dashboard UID" },
    { key: "url", type: "string", label: "Dashboard URL" },
    { key: "version", type: "number", label: "New version" },
  ],

  execute(input, ctx) {
    const client = GrafanaClient.fromConnection(ctx);
    return client.request("/dashboards/db", {
      method: "POST",
      body: {
        dashboard: input.dashboard,
        folderUid: input.folderUid,
        overwrite: input.overwrite ?? false,
        message: input.message,
      },
    });
  },
};

export default dashboardCreateUpdate;
