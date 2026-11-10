import { snapshotTrigger } from "../lib/polls.ts";
import listVenues from "../actions/list-venues.ts";
import { T5_SAMPLE, VENUE_OUTPUT } from "../lib/outputs.ts";

/**
 * Eventbrite's venue webhook is update-only (`venue.updated`), so a new venue is found by reading
 * the whole list (`GET /organizations/{id}/venues/`, read by `list-venues`) and comparing it check
 * to check. https://www.eventbrite.com/platform/api and
 * https://www.eventbrite.com/platform/docs/webhooks (verified 2026-11-10).
 */
const newVenue = snapshotTrigger({
  key: "new-venue",
  title: "New Venue",
  description:
    "Checks an organization's venues on a schedule. The run gets each venue added since the previous check: its name, address and capacity.",
  action: listVenues,
  list: "venues",
  paged: true,
  params: [{
    key: "organizationId",
    label: "Organization ID",
    type: "string",
    required: true,
    hint: "The organization to watch.",
  }],
  input: (p) => ({ organizationId: String(p.organizationId ?? "").trim() }),
  output: VENUE_OUTPUT,
  sample: T5_SAMPLE.venues.venues[0],
});

export default newVenue;
