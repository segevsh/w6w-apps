import type { TriggerDefinition } from "@w6w/types";
import clickList from "../actions/click-list.ts";
import { pollDatedList } from "../lib/triggers.ts";

/**
 * `GET /clicks/` has no sort order and only a day-granular `date_from` / `date_to` ("a day in UTC",
 * https://developers.tapfiliate.com/api-reference/clicks/list-all-clicks, 2026-11-10), so the check is
 * a since-filter poll (brief §9.1 b, §9.8, §9.9) — see `lib/triggers.ts`. Clicks are an
 * Enterprise-plan feature; on other plans the vendor's error surfaces as a failed check.
 */
const trigger: TriggerDefinition = {
  key: "new-click",
  title: "New Click",
  description: "The run gets each newly recorded affiliate click.",
  output: [
    { key: "id", type: "string", label: "Click ID" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "details", type: "object", label: "Browser, referrer and landing page" },
    { key: "geolocation", type: "object", label: "Country" },
  ],
  sample: {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    created_at: "2026-11-09T12:00:00+00:00",
    details: { browser: "Chrome", referrer: "https://example-blog.inc/post/" },
    geolocation: { country: "United States", country_code: "US" },
  },
  minIntervalMs: 300_000,
  poll: pollDatedList(clickList),
};

export default trigger;
