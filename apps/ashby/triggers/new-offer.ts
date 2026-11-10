import offerList from "../actions/offer-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";
import { toMs } from "../lib/window.ts";

/** Emits each offer created since the previous successful check (`offer.list` with `createdAfter`). Brief 9.1 (b), 9.8, 9.9. */
export default sinceTrigger({
  key: "new-offer",
  title: "New Offer",
  description:
    "Emits each offer created since the previous successful check (`offer.list` with `createdAfter`).",
  action: offerList,
  list: "offers",
  tsOf: (item) =>
    toMs((item.latestVersion as { createdAt?: unknown } | undefined)?.createdAt ?? item.createdAt),
  output: [
    { key: "id", type: "string", label: "Offer ID" },
    { key: "applicationId", type: "string", label: "Application ID" },
    { key: "offerStatus", type: "string", label: "Offer status" },
    { key: "acceptanceStatus", type: "string", label: "Acceptance status" },
  ],
  sample: {
    id: "offer-101",
    applicationId: "app-101",
    offerStatus: "WaitingOnCandidateResponse",
    acceptanceStatus: "Pending",
  },
});
