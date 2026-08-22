import type { ActionDefinition } from "@w6w/types";
import { assertUuid, LeverClient } from "../lib/client.ts";

/**
 * `GET /v1/opportunities/{id}/offers` — what has been offered, and where it
 * got to.
 *
 * ## The offer is the part of hiring with a deadline
 *
 * An offer that has been created and not sent, or sent and not signed, is the
 * state everybody wants to know about — and it is the one thing in a hiring
 * pipeline where a day matters. That makes it worth a workflow: an offer
 * outstanding for a week is a question somebody should be asked.
 *
 * ## `status` is the whole story
 *
 * `draft` is written and not sent. `sent` is with the candidate. `signed` is
 * accepted. `approved` and `denied` are the internal approval chain, which
 * happens before sending. A workflow that treats anything but `signed` as
 * pending is right, and one that treats `approved` as accepted is reading an
 * internal decision as the candidate's.
 *
 * ## Offer fields are custom, and they contain compensation
 *
 * The `fields` array is whatever that Lever account's offer form asks for —
 * usually including salary and equity. This is compensation data about a named
 * person, and it is returned as-is; nothing here logs it.
 */
const action: ActionDefinition = {
  key: "offer-list",
  type: "read",
  resource: "offer",
  title: "List offers",
  description:
    "What has been offered to a candidate and where it got to. `signed` is acceptance; " +
    "`approved` is only the INTERNAL approval chain, which is a different thing. Offer fields " +
    "are that account's own form and usually include compensation.",
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "offers", type: "array", label: "The offers, newest first" },
    { key: "count", type: "number", label: "How many" },
    { key: "latestStatus", type: "string", label: "Where the most recent one stands" },
    { key: "hasSignedOffer", type: "boolean", label: "Whether the candidate accepted" },
    { key: "awaitingCandidate", type: "boolean", label: "Sent, and not yet signed" },
    { key: "awaitingApproval", type: "boolean", label: "Waiting on an internal decision" },
    { key: "daysOutstanding", type: "number", label: "How long the latest offer has been out" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const opportunityId = assertUuid(p.opportunityId, "opportunityId");

    const page = await new LeverClient(ctx).list<{
      id?: string;
      status?: string;
      createdAt?: number;
      sentAt?: number | null;
      signedAt?: number | null;
    }>(`/opportunities/${encodeURIComponent(opportunityId)}/offers`);

    const offers = page.data;
    const latest = offers[0];
    const status = String(latest?.status ?? "");

    // Sent and unsigned is the state with a clock on it.
    const sentAt = Number(latest?.sentAt ?? 0);
    const daysOutstanding = status === "sent" && sentAt
      ? Math.floor((Date.now() - sentAt) / 86_400_000)
      : undefined;

    if (daysOutstanding !== undefined && daysOutstanding >= 7) {
      ctx.log(
        "info",
        "this offer has been with the candidate for a week or more without being signed, which " +
          "is usually a conversation somebody should be having",
        { opportunityId, daysOutstanding },
      );
    }

    // Counts and statuses. Offer fields carry someone's compensation.
    ctx.log("info", "read Lever offers", { opportunityId, count: offers.length });

    return {
      offers,
      count: offers.length,
      latestStatus: status || undefined,
      hasSignedOffer: offers.some((offer) => offer?.status === "signed"),
      awaitingCandidate: status === "sent",
      // Internal, and not the candidate saying yes.
      awaitingApproval: ["draft", "approval-sent", "approved"].includes(status),
      daysOutstanding,
    };
  },
};

export default action;
