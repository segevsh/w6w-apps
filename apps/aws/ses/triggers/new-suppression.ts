import suppressionList from "../actions/suppression-list.ts";
import { MAX_EVENTS, sinceTrigger } from "../lib/triggers.ts";
import { toMs } from "../lib/window.ts";

/** `ListSuppressedDestinations` `StartDate` keeps only addresses added after that date. */
export default sinceTrigger({
  key: "new-suppression",
  title: "New Suppressed Address",
  description: "The run gets each address newly added to the account suppression list.",
  output: [
    { key: "emailAddress", type: "string", label: "Email address" },
    { key: "reason", type: "string", label: "Reason (BOUNCE or COMPLAINT)" },
    { key: "lastUpdateTime", type: "string", label: "Last update time" },
  ],
  sample: {
    emailAddress: "bounced@example.com",
    reason: "BOUNCE",
    lastUpdateTime: "2026-11-09T10:00:00.000Z",
  },
  async list(ctx, since, nextToken) {
    const res = await suppressionList.execute(
      { startDate: since, pageSize: MAX_EVENTS, nextToken },
      ctx,
    ) as { destinations?: unknown[]; nextToken?: string };
    return { items: res.destinations ?? [], nextToken: res.nextToken };
  },
  idOf: (item) => String((item as { emailAddress?: unknown }).emailAddress ?? ""),
  tsOf: (item) => toMs((item as { lastUpdateTime?: unknown }).lastUpdateTime),
});
