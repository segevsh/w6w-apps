import type { ActionDefinition } from "@w6w/types";
import { csv, VantaClient } from "../lib/client.ts";

/**
 * `POST /v1/people/offboard` — complete the offboarding workflow for people who
 * have left.
 *
 * ## Why this is worth automating, and why it is the one write here that
 * matters
 *
 * Offboarding is the control auditors test hardest, because it is the one that
 * fails quietly: an engineer leaves, their accounts linger, and nobody notices
 * until somebody looks. Vanta tracks it as a checklist per person, and closing
 * that checklist is a real, repetitive task that belongs in a workflow driven
 * by the HR system.
 *
 * ## `acknowledgerId` is not a formality
 *
 * Vanta requires it, and it is the point of the endpoint: somebody is recorded
 * as having *done* the offboarding. That name goes in the audit trail and is
 * what an auditor asks about — so it should be the person actually accountable,
 * not a generic service account nobody can be asked about later.
 *
 * It is a **user** id (somebody with a Vanta login), while the people being
 * offboarded are **person** ids. The two rosters are different, and this is the
 * action where confusing them is most likely.
 *
 * ## It does not revoke anything by itself
 *
 * Offboarding in Vanta records and completes the checklist — deactivating
 * unmonitored accounts as part of it — but it does not reach into every system
 * a person had access to. A workflow that calls this and stops has documented
 * an offboarding rather than performed one.
 *
 * Up to 1000 people per call.
 */
const action: ActionDefinition = {
  key: "person-offboard",
  type: "perform",
  resource: "person",
  title: "Offboard people",
  description:
    "Complete Vanta's offboarding checklist for people who have left. The acknowledger is " +
    "recorded in the audit trail — it should be somebody who can be asked about it.",
  idempotent: true,
  params: [
    {
      key: "personIds",
      label: "Person IDs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated, from `person-list`. Up to 1000 per call.",
    },
    {
      key: "acknowledgerId",
      label: "Acknowledger (User ID)",
      type: "string",
      required: true,
      default: "",
      hint: "The Vanta USER recorded as having completed the offboarding — from `user-list`, not " +
        "`person-list`. An auditor will ask about this name, so a generic service account is a " +
        "poor answer.",
    },
    {
      key: "confirm",
      label: "These people have left",
      type: "boolean",
      required: true,
      default: false,
      hint: "Offboarding closes a compliance checklist against real people and is recorded " +
        "against the acknowledger.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Offboarded" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ids = csv(p.personIds);
    if (!ids || ids.length === 0) throw new Error("`personIds` is required");
    if (ids.length > 1000) {
      throw new Error(`Vanta accepts at most 1000 people per call; ${ids.length} were given`);
    }
    const acknowledgerId = String(p.acknowledgerId ?? "").trim();
    if (!acknowledgerId) {
      throw new Error(
        "`acknowledgerId` is required — Vanta records who completed the offboarding, and it is " +
          "the field an auditor asks about",
      );
    }
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` — offboarding closes a compliance checklist against real people, recorded " +
          "against the acknowledger",
      );
    }

    const client = new VantaClient(ctx);
    await client.request("/people/offboard", {
      method: "POST",
      body: { updates: ids.map((id) => ({ id, acknowledgerId })) },
    });
    // The count and the acknowledger; never the roster.
    ctx.log("info", "offboarded people in Vanta", { count: ids.length, acknowledgerId });
    return { ok: true };
  },
};

export default action;
