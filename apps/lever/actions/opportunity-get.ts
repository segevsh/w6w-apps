import type { ActionDefinition } from "@w6w/types";
import { assertUuid, csv, isAnonymized, LeverClient, query } from "../lib/client.ts";

/**
 * `GET /v1/opportunities/{id}` — one application, and the person behind it.
 *
 * ## Almost everything interesting is an id until you expand it
 *
 * The stage, the owner, the followers, the contact and the applications all
 * come back as UUIDs by default. `expand` inlines them, and doing so in one
 * request beats four — which matters because Lever rate-limits and gives no
 * header to pace against.
 *
 * ## An anonymized contact has no name and no email
 *
 * Lever anonymizes contacts on a data-protection request: the personal fields
 * are stripped and the record stays for reporting. A workflow reading a name
 * off one gets an empty string, which looks like a broken record rather than
 * an erasure somebody asked for. This action says which it is.
 *
 * ## `archived` is an object, not a flag
 *
 * When set it carries the reason and the timestamp. An archived opportunity
 * with a reason that maps to *Hired* is a hire, which is a materially
 * different thing from a rejection and is only distinguishable by looking up
 * the reason — `archive-reason-list` is where those live.
 */
const action: ActionDefinition = {
  key: "opportunity-get",
  type: "read",
  resource: "opportunity",
  title: "Get an opportunity",
  description:
    "One application with the person behind it. Nearly every field is an ID until `expand` " +
    "inlines it, and doing that in one request matters because Lever rate-limits with no header " +
    "to pace against. Flags an ANONYMIZED contact, which has no name or email by design.",
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "string", required: true, default: "" },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      default: "contact, stage, owner, applications",
      hint: "Comma-separated. Without these you get UUIDs and four more requests.",
    },
  ],
  output: [
    { key: "opportunity", type: "object", label: "The opportunity" },
    { key: "name", type: "string", label: "The candidate's name" },
    { key: "contactId", type: "string", label: "The person — stable across applications" },
    { key: "stage", type: "object", label: "Where it sits in the pipeline" },
    { key: "isArchived", type: "boolean", label: "Whether it is closed" },
    { key: "archiveReasonId", type: "string", label: "Which reason, if archived" },
    { key: "isAnonymized", type: "boolean", label: "Personal data removed on request" },
    { key: "origin", type: "string", label: "applied, sourced, referred and so on" },
    { key: "tags", type: "array", label: "Its tags" },
    { key: "applicationIds", type: "array", label: "Applications on this opportunity" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const opportunityId = assertUuid(p.opportunityId, "opportunityId");

    // The declared default only reaches this action when the host applies it;
    // an invocation that omits `expand` would otherwise get UUIDs and need
    // four more requests, which is the thing this action exists to avoid.
    const expand = csv(p.expand) ?? ["contact", "stage", "owner", "applications"];

    const opportunity = await new LeverClient(ctx).one<{
      id?: string;
      name?: string;
      contact?: string | { id?: string; isAnonymized?: boolean };
      stage?: unknown;
      archived?: { reason?: string; archivedAt?: number } | null;
      origin?: string;
      tags?: string[];
      applications?: Array<string | { id?: string }>;
    }>(`/opportunities/${encodeURIComponent(opportunityId)}`, {
      query: query({ expand: expand.join(",") }),
    });

    const contact = opportunity?.contact;
    const anonymized = typeof contact === "object" ? isAnonymized(contact) : false;
    if (anonymized) {
      ctx.log(
        "info",
        "this contact has been ANONYMIZED at their request — the name, email and phone are gone " +
          "by design, and the record remains for reporting",
        { opportunityId },
      );
    }

    return {
      opportunity,
      name: opportunity?.name,
      contactId: typeof contact === "string" ? contact : contact?.id,
      stage: opportunity?.stage,
      isArchived: Boolean(opportunity?.archived),
      // Whether this was a hire or a rejection is a property of the reason.
      archiveReasonId: opportunity?.archived?.reason,
      isAnonymized: anonymized,
      origin: opportunity?.origin,
      tags: opportunity?.tags ?? [],
      applicationIds: (opportunity?.applications ?? []).map((application) =>
        typeof application === "string" ? application : application?.id
      ).filter(Boolean),
    };
  },
};

export default action;
