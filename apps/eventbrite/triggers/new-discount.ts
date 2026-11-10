import { snapshotTrigger } from "../lib/polls.ts";
import searchDiscounts from "../actions/search-discounts.ts";
import { DISCOUNT_OUTPUT, DISCOUNT_SAMPLE } from "../lib/outputs.ts";

/**
 * Eventbrite sends no webhook for discounts. The whole list for one scope
 * (`GET /organizations/{id}/discounts/?scope=…`, read by `search-discounts`) is compared check to
 * check. The `event` scope needs an event id (https://www.eventbrite.com/platform/api, "Search
 * Discounts by Organization", verified 2026-11-10); a missing one is refused before any request.
 */
const newDiscount = snapshotTrigger({
  key: "new-discount",
  title: "New Discount",
  description:
    "Checks an organization's discounts and access codes on a schedule. The run gets each discount created since the previous check: its code, type and amount.",
  action: searchDiscounts,
  list: "discounts",
  paged: true,
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      hint: "The organization to watch.",
    },
    {
      key: "scope",
      label: "Scope",
      type: "select",
      required: true,
      default: "event",
      options: [
        { value: "event", label: "One event" },
        { value: "multi_events", label: "Several events" },
        { value: "user", label: "Account-wide" },
      ],
    },
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      hint: "Required when the scope is one event.",
    },
  ],
  input: (p) => {
    const scope = typeof p.scope === "string" && p.scope !== "" ? p.scope : "event";
    const eventId = String(p.eventId ?? "").trim();
    if (scope === "event" && !eventId) {
      throw new Error("Set Event ID to the event whose discounts to watch (scope: one event).");
    }
    return {
      organizationId: String(p.organizationId ?? "").trim(),
      scope,
      ...(scope === "event" ? { eventId } : {}),
    };
  },
  output: DISCOUNT_OUTPUT,
  sample: DISCOUNT_SAMPLE,
});

export default newDiscount;
