import type { ActionDefinition } from "@w6w/types";
import { assertPerformAs, assertUuid, compact, LeverClient, query } from "../lib/client.ts";

/**
 * `PUT /v1/opportunities/{id}/archived` — close a candidate out, or reopen
 * them.
 *
 * ## One endpoint does rejection, hiring and reopening
 *
 * The `reason` decides which. A reason that maps to **Hired**, together with a
 * requisition, marks the candidate hired, removes the active offer from that
 * requisition and **increments its hire count** — a change to headcount
 * reporting, from what looks like an archive call.
 *
 * Passing `null` as the reason **unarchives** instead. So the same request
 * shape covers "rejected", "hired" and "actually, they are back in the
 * process", and only the reason distinguishes them.
 *
 * ## The reasons are per account, and this is why `archive-reason-list` exists
 *
 * Reason UUIDs differ between Lever accounts, and which of them counts as a
 * hire is a property of the account's configuration rather than of the API. A
 * workflow with a hardcoded reason id is one pipeline rebuild away from
 * archiving people under the wrong heading.
 *
 * ## `cleanInterviews` throws away what is scheduled
 *
 * On by choice: it removes pending interviews when archiving, which is usually
 * kind — nobody wants an interview invitation for a candidate who was rejected
 * yesterday — and it does cancel things in people's calendars.
 */
const action: ActionDefinition = {
  key: "opportunity-archive",
  type: "perform",
  resource: "opportunity",
  title: "Archive or unarchive an opportunity",
  description:
    "Close a candidate out, mark them HIRED, or reopen them — one endpoint, and the REASON " +
    "decides which. A hire reason with a requisition increments that requisition's hire count. " +
    "An empty reason unarchives.",
  idempotent: true,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "string", required: true, default: "" },
    {
      key: "reasonId",
      label: "Archive reason ID",
      type: "string",
      default: "",
      hint: "From `archive-reason-list`. Empty UNARCHIVES. Reason ids differ between accounts, " +
        "and which of them counts as a hire is account configuration.",
    },
    {
      key: "performAs",
      label: "Perform as (user ID)",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "requisitionId",
      label: "Requisition ID",
      type: "string",
      default: "",
      hint: "Only with a hire reason. It removes the active offer from the requisition and " +
        "INCREMENTS its hire count, which is a change to headcount reporting.",
    },
    {
      key: "cleanInterviews",
      label: "Cancel pending interviews",
      type: "boolean",
      default: false,
      hint: "Removes scheduled interviews — which cancels events in people's calendars.",
    },
  ],
  output: [
    { key: "opportunityId", type: "string", label: "Which candidate" },
    { key: "archived", type: "boolean", label: "Whether they are now closed out" },
    { key: "reasonId", type: "string", label: "Under which reason" },
    { key: "reasonText", type: "string", label: "What that reason is called" },
    { key: "wasArchived", type: "boolean", label: "Whether they already were" },
    { key: "unarchived", type: "boolean", label: "True when this reopened them" },
    { key: "countedAsHire", type: "boolean", label: "Whether a requisition's hire count moved" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const opportunityId = assertUuid(p.opportunityId, "opportunityId");
    const performAs = assertPerformAs(p.performAs);
    const reasonId = String(p.reasonId ?? "").trim();
    const requisitionId = String(p.requisitionId ?? "").trim();
    if (reasonId) assertUuid(reasonId, "reasonId");
    if (requisitionId) assertUuid(requisitionId, "requisitionId");

    if (requisitionId && !reasonId) {
      throw new Error(
        "a `requisitionId` only means something with a hire `reasonId` — on its own this call " +
          "would unarchive the candidate while appearing to record a hire",
      );
    }

    const client = new LeverClient(ctx);
    const before = await client.one<{ archived?: { reason?: string } | null }>(
      `/opportunities/${encodeURIComponent(opportunityId)}`,
    );
    const wasArchived = Boolean(before?.archived);

    // Which reasons count as a hire is account configuration, not API shape.
    let reasonText = "";
    let countedAsHire = false;
    if (reasonId) {
      try {
        const reasons = await client.list<{ id?: string; text?: string }>("/archive_reasons");
        const reason = reasons.data.find((entry) => entry?.id === reasonId);
        reasonText = String(reason?.text ?? "");
        countedAsHire = Boolean(requisitionId) && /hired/i.test(reasonText);
      } catch { /* the label is context, not a gate */ }
    }

    if (countedAsHire) {
      ctx.log(
        "warn",
        "this archives the candidate as HIRED against a requisition, which removes the active " +
          "offer from it and increments its hire count — a change to headcount reporting",
        { opportunityId },
      );
    }
    if (p.cleanInterviews === true) {
      ctx.log(
        "info",
        "pending interviews are being removed, which cancels events in people's " +
          "calendars",
        { opportunityId },
      );
    }

    await client.request(`/opportunities/${encodeURIComponent(opportunityId)}/archived`, {
      method: "PUT",
      query: query({ perform_as: performAs }),
      // `reason: null` is how Lever unarchives, so the reason is set outside
      // `compact` — which drops nulls, and would turn an unarchive into a
      // request that says nothing at all.
      body: {
        reason: reasonId || null,
        ...compact({
          cleanInterviews: p.cleanInterviews === true ? true : undefined,
          requisitionId: requisitionId || undefined,
        }),
      },
    });

    return {
      opportunityId,
      archived: Boolean(reasonId),
      reasonId: reasonId || undefined,
      reasonText: reasonText || undefined,
      wasArchived,
      unarchived: !reasonId && wasArchived,
      countedAsHire,
    };
  },
};

export default action;
