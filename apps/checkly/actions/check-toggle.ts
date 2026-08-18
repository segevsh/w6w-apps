import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `PUT /v1/checks/{id}` — verified against Checkly's OpenAPI document
 * (`putV1ChecksId`).
 *
 * **Activated and muted are different switches, and confusing them is how
 * monitoring goes quiet without anyone noticing.**
 *
 *   - **Deactivated** — the check does not run at all. Nothing is being
 *     watched, and no alert can fire because there is nothing to alert on.
 *   - **Muted** — the check runs and records results normally, but its alerts
 *     do not go out.
 *
 * For a deploy window you almost always want *muted*, or better a maintenance
 * window: deactivating loses the result history for the period, so you cannot
 * tell afterwards whether the thing was actually broken.
 *
 * This is a `PUT` on a resource with many fields, and Checkly treats an omitted
 * field as unchanged for these two — so this action sends only the switch it
 * was asked to flip.
 */
const action: ActionDefinition = {
  key: "check-toggle",
  type: "perform",
  resource: "check",
  title: "Activate, deactivate or mute a check",
  description: "Turn a monitor on or off, or silence its alerts while it keeps running.",
  idempotent: true,
  params: [
    { key: "checkId", label: "Check ID", type: "string", required: true, default: "" },
    {
      key: "activated",
      label: "Running",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "Activated — the check runs" },
        { value: "false", label: "Deactivated — the check does not run at all" },
      ],
      hint: "Deactivating stops the check entirely, so there is no history for the period.",
    },
    {
      key: "muted",
      label: "Alerts",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "false", label: "Alerting — failures notify" },
        { value: "true", label: "Muted — the check runs, alerts do not go out" },
      ],
      hint: "Muting is usually what a deploy window wants: results are still recorded.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Check ID" },
    { key: "activated", type: "boolean", label: "Running" },
    { key: "muted", type: "boolean", label: "Muted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.checkId ?? "").trim();
    if (!id) throw new Error("`checkId` is required");

    const body: Record<string, unknown> = {};
    // "" means leave unchanged, so only an explicit choice is sent — `false` is
    // a real setting here and must not be dropped as falsy.
    if (p.activated === "true" || p.activated === true) body.activated = true;
    if (p.activated === "false" || p.activated === false) body.activated = false;
    if (p.muted === "true" || p.muted === true) body.muted = true;
    if (p.muted === "false" || p.muted === false) body.muted = false;
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to change — set Running or Alerts");
    }

    ctx.log("info", "toggling a Checkly check", { id, fields: Object.keys(body) });

    return await new ChecklyClient(ctx).request(`/v1/checks/${encodeURIComponent(id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
