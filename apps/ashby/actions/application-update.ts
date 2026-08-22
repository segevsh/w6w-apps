import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";

/**
 * `POST /application.update` — set the attribution fields on an application.
 *
 * In practice this action is about two fields, and they are the ones every
 * sourcing report is built from: **`sourceId`** (where this application came
 * from) and **`creditedToUserId`** (who gets credit for it). Attribution
 * arriving late — an agency confirms a referral, an ATS import lands without a
 * source — is exactly the sort of correction a workflow should make.
 *
 * Both accept an explicit `null` to unset, which the usual drop-empty-fields
 * compaction would swallow, so the literal string `null` is honoured.
 *
 * `createdAt` is unusual and worth flagging: setting it also **rewrites the
 * first history event's timestamp**, which is what makes a migrated application
 * appear in the right place in a time-to-hire report rather than all on the
 * import date.
 */
const action: ActionDefinition = {
  key: "application-update",
  type: "perform",
  resource: "application",
  title: "Update an application",
  description:
    "Set an application's source and credited user — the fields every sourcing report is built " +
    "from. Setting `createdAt` also moves the first history event, which fixes migrated data.",
  idempotent: true,
  params: [
    { key: "applicationId", label: "Application ID", type: "string", required: true, default: "" },
    {
      key: "sourceId",
      label: "Source ID",
      type: "string",
      default: "",
      hint: "`source-list` maps names to ids. The literal `null` unsets it.",
    },
    {
      key: "creditedToUserId",
      label: "Credited To (User ID)",
      type: "string",
      default: "",
      hint: "The literal `null` unsets it.",
    },
    {
      key: "createdAt",
      label: "Created At",
      type: "datetime",
      default: "",
      advanced: true,
      hint: "An ISO date string. Also rewrites the first history event's timestamp — which is " +
        "how a migrated application lands correctly in a time-to-hire report.",
    },
    {
      key: "sendNotifications",
      label: "Notify Subscribers",
      type: "boolean",
      default: false,
    },
  ],
  output: [{ key: "id", type: "string", label: "Application ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const applicationId = String(p.applicationId ?? "").trim();
    if (!applicationId) throw new Error("`applicationId` is required");

    const body = compact({ createdAt: p.createdAt });
    for (const key of ["sourceId", "creditedToUserId"] as const) {
      const raw = p[key];
      if (String(raw ?? "") === "null") body[key] = null;
      else if (raw !== undefined && raw !== null && raw !== "") body[key] = raw;
    }
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — give a source, credited user or created date");
    }

    return await new AshbyClient(ctx).request("application.update", {
      body: { applicationId, ...body, sendNotifications: p.sendNotifications === true },
    });
  },
};

export default action;
