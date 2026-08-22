import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient, compact, csv } from "../lib/client.ts";

/**
 * `POST /v1/maintenance-windows` — verified against Checkly's OpenAPI document
 * (`postV1Maintenancewindows`; required `name`, `startsAt`, `endsAt` and
 * `repeatUnit`).
 *
 * **This is the right way to silence monitoring for a deploy.** The two
 * alternatives are worse: deactivating checks stops them running, so there is
 * no record of whether the deploy broke anything, and muting them individually
 * is a lot of calls to remember to undo. A window has an end time, so nothing
 * stays silenced because a workflow failed halfway.
 *
 * **`silenceAllAlerts` and `pauseAllChecks` are the two knobs, and they are not
 * the same.** Silencing keeps the checks running and records their results
 * while suppressing the notifications — which is almost always what a deploy
 * window wants. Pausing stops them, and the history for the window is simply
 * absent.
 */
const action: ActionDefinition = {
  key: "maintenance-window-create",
  type: "perform",
  resource: "maintenance-window",
  title: "Create a maintenance window",
  description: "Silence (or pause) monitoring for a bounded period — the deploy-window action.",
  // Two calls make two overlapping windows.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    {
      key: "startsAt",
      label: "Starts At",
      type: "string",
      required: true,
      default: "",
      placeholder: "2026-08-18T12:00:00.000Z",
      hint: "ISO 8601.",
    },
    {
      key: "endsAt",
      label: "Ends At",
      type: "string",
      required: true,
      default: "",
      placeholder: "2026-08-18T13:00:00.000Z",
      hint: "ISO 8601. A window with an end is what stops monitoring staying off by accident.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Comma-separated. Only checks carrying these tags are affected; blank means all.",
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      required: true,
      default: "silence",
      options: [
        { value: "silence", label: "Silence alerts — checks keep running and recording" },
        { value: "pause", label: "Pause checks — no runs, and no history for the window" },
      ],
    },
    {
      key: "repeatUnit",
      label: "Repeat",
      type: "select",
      required: true,
      default: "",
      options: [
        { value: "", label: "Once" },
        { value: "DAY", label: "Daily" },
        { value: "WEEK", label: "Weekly" },
        { value: "MONTH", label: "Monthly" },
      ],
    },
    {
      key: "repeatInterval",
      label: "Repeat Every",
      type: "number",
      default: 1,
      showIf: { "!=": [{ var: "repeatUnit" }, ""] },
    },
    { key: "description", label: "Description", type: "text", default: "" },
  ],
  output: [
    { key: "id", type: "number", label: "Window id" },
    { key: "name", type: "string", label: "Name" },
    { key: "startsAt", type: "string", label: "Starts" },
    { key: "endsAt", type: "string", label: "Ends" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const startsAt = String(p.startsAt ?? "").trim();
    const endsAt = String(p.endsAt ?? "").trim();
    if (!startsAt || !endsAt) throw new Error("`startsAt` and `endsAt` are both required");
    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      throw new Error("`endsAt` must be after `startsAt`");
    }
    const mode = String(p.mode ?? "silence");

    const body = compact({
      name,
      startsAt,
      endsAt,
      tags: csv(p.tags),
      description: p.description,
      repeatUnit: (p.repeatUnit as string) || undefined,
      repeatInterval: (p.repeatUnit as string) ? Number(p.repeatInterval ?? 1) : undefined,
    });
    // Both flags are meaningful when false, so neither goes through `compact`.
    body.silenceAllAlerts = mode === "silence";
    body.pauseAllChecks = mode === "pause";

    ctx.log("info", "creating a Checkly maintenance window", { name, mode });

    return await new ChecklyClient(ctx).request("/v1/maintenance-windows", {
      method: "POST",
      body,
    });
  },
};

export default action;
