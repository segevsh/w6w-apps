import type { ActionDefinition } from "@w6w/types";
import { VantaClient } from "../lib/client.ts";

/**
 * `POST /v1/controls/{controlId}/set-owner` — make somebody accountable.
 *
 * The counterpart to `control-list`'s unowned report, and the most useful write
 * in this app: assigning ownership across a framework is a real, repetitive job
 * that a workflow does well and a person does slowly.
 *
 * ## The id is a **user**, not a **person**
 *
 * This is the mistake to avoid. Vanta has two rosters and they are not the
 * same:
 *
 *   - a **person** is somebody in the organisation being monitored for
 *     compliance — every employee, whether or not they have ever opened Vanta;
 *   - a **user** is somebody with a Vanta login.
 *
 * Ownership is a user id. Passing a person id from `person-list` fails, or
 * worse, silently assigns nobody. `user-list` is the right source.
 *
 * Passing the literal `null` **unassigns** the control, which is the honest way
 * to record that the previous owner has left — better than leaving a departed
 * employee named against a requirement.
 */
const action: ActionDefinition = {
  key: "control-set-owner",
  type: "perform",
  resource: "control",
  title: "Set a control's owner",
  description:
    "Make a Vanta USER accountable for a control — not a person. The two rosters differ, and " +
    "passing a person id from `person-list` will not work.",
  idempotent: true,
  params: [
    { key: "controlId", label: "Control ID", type: "string", required: true, default: "" },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `user-list` — somebody with a Vanta login, not an entry from `person-list`. " +
        "The literal `null` unassigns the control.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Assigned" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const controlId = String(p.controlId ?? "").trim();
    if (!controlId) throw new Error("`controlId` is required");
    const raw = String(p.userId ?? "").trim();
    if (!raw) {
      throw new Error("`userId` is required — pass the literal `null` to unassign the control");
    }
    // `null` unassigns, and has to survive as a real null.
    const userId = raw === "null" ? null : raw;

    const client = new VantaClient(ctx);
    await client.request(`/controls/${encodeURIComponent(controlId)}/set-owner`, {
      method: "POST",
      body: { userId },
    });
    ctx.log("info", userId === null ? "unassigned a Vanta control" : "assigned a Vanta control", {
      controlId,
    });
    return { ok: true };
  },
};

export default action;
