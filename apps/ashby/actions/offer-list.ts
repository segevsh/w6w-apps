import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, csv, epochMillis } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `POST /offer.list` — offers, and the three separate states they carry.
 *
 * This is the endpoint where a small distinction saves a lot of confusion.
 * An offer has **three independent statuses**, and reading one for another is
 * the usual cause of a report that says people were hired who were not:
 *
 *   - **`offerStatus`** — where the offer is in *your* process: drafted, sent,
 *     retracted.
 *   - **`acceptanceStatus`** — what the **candidate** did: accepted, declined,
 *     or not yet answered.
 *   - **`approvalStatus`** — whether the offer's latest version cleared
 *     internal approval, which is a different question from whether anybody
 *     sent it.
 *
 * An offer can be internally approved, never sent, and therefore neither
 * accepted nor declined. All three filters are exposed here because a real
 * question usually picks one: "who has an unanswered offer" is
 * `acceptanceStatus`, and "what is stuck in approval" is `approvalStatus`.
 *
 * Offers carry compensation, so nothing from the response is logged.
 */
const action: ActionDefinition = {
  key: "offer-list",
  type: "read",
  resource: "offer",
  title: "List offers",
  description:
    "Offers, with their three INDEPENDENT statuses — where it is in your process, what the " +
    "candidate answered, and whether it cleared approval. Reading one for another misreports hires.",
  params: [
    {
      key: "offerStatus",
      label: "Offer Status",
      type: "string",
      default: "",
      hint: "Where the offer is in your process. Comma-separated.",
    },
    {
      key: "acceptanceStatus",
      label: "Acceptance Status",
      type: "string",
      default: "",
      hint: "What the CANDIDATE did. 'Who has not answered yet' is this one.",
    },
    {
      key: "approvalStatus",
      label: "Approval Status",
      type: "string",
      default: "",
      hint: "Whether the latest version cleared internal approval — separate from being sent.",
    },
    { key: "applicationId", label: "Application ID", type: "string", default: "" },
    { key: "createdAfter", label: "Created After", type: "datetime", default: "" },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "offers", type: "array", label: "Offers" },
    { key: "count", type: "number", label: "Offers returned" },
    { key: "syncToken", type: "string", label: "Store this and pass it next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new AshbyClient(ctx);
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "offer.list",
      compact({
        syncToken: p.syncToken,
        offerStatus: csv(p.offerStatus),
        acceptanceStatus: csv(p.acceptanceStatus),
        approvalStatus: csv(p.approvalStatus),
        applicationId: p.applicationId,
        createdAfter: epochMillis(p.createdAfter, "createdAfter"),
      }),
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    // A count only — an offer carries somebody's compensation.
    ctx.log("info", "read Ashby offers", { count: page.items.length });
    return { offers: page.items, count: page.items.length, syncToken: page.syncToken };
  },
};

export default action;
