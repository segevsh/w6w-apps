import type { ActionDefinition } from "@w6w/types";
import { AshbyClient } from "../lib/client.ts";

/**
 * `POST /offer.info` — one offer, including what it is actually offering.
 *
 * The form definition and submitted values carry the compensation: salary,
 * equity, bonus, start date. That is the most sensitive payload this app can
 * return, and the reason `excludeFormDefinition` exists as a first-class option
 * here rather than an advanced footnote — a workflow checking *whether* an
 * offer was accepted does not need to carry the numbers through every
 * subsequent step to find out.
 *
 * Defaulting to excluding the form definition would be the safer choice and the
 * wrong one, because generating an offer letter or syncing to payroll needs it.
 * So the default matches Ashby's and the option is prominent.
 *
 * Nothing from the response is logged.
 */
const action: ActionDefinition = {
  key: "offer-get",
  type: "read",
  resource: "offer",
  title: "Get an offer",
  description:
    "One offer with its terms — salary, equity, start date. Exclude the form definition when " +
    "the workflow only needs to know whether it was accepted.",
  params: [
    { key: "offerId", label: "Offer ID", type: "string", required: true, default: "" },
    {
      key: "excludeFormDefinition",
      label: "Exclude the Terms",
      type: "boolean",
      default: false,
      hint: "Leaves out the compensation form. Use it when the workflow only needs the statuses " +
        "— there is no reason to carry somebody's salary through steps that do not read it.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Offer ID" },
    { key: "offerStatus", type: "string", label: "Where it is in your process" },
    { key: "acceptanceStatus", type: "string", label: "What the candidate answered" },
    { key: "latestVersion", type: "object", label: "The current terms, unless excluded" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const offerId = String(p.offerId ?? "").trim();
    if (!offerId) throw new Error("`offerId` is required");

    return await new AshbyClient(ctx).request("offer.info", {
      body: {
        offerId,
        ...(p.excludeFormDefinition === true ? { excludeFormDefinition: true } : {}),
      },
    });
  },
};

export default action;
