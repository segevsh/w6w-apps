import { snapshotTrigger } from "../lib/polls.ts";
import listOrganizers from "../actions/list-organizers.ts";
import { ORGANIZER_OUTPUT, T5_SAMPLE } from "../lib/outputs.ts";

/**
 * Eventbrite's organizer webhook is update-only (`organizer.updated`), and an organization has a
 * handful of organizers, so the whole list (`GET /organizations/{id}/organizers/`, read by
 * `list-organizers`) is compared check to check. The action pages by number, not by continuation
 * token; a response that says it has more is refused. https://www.eventbrite.com/platform/api and
 * https://www.eventbrite.com/platform/docs/webhooks (verified 2026-11-10).
 */
const newOrganizer = snapshotTrigger({
  key: "new-organizer",
  title: "New Organizer",
  description:
    "Checks an organization's organizers on a schedule. The run gets each organizer added since the previous check: its name, description and links.",
  action: listOrganizers,
  list: "organizers",
  paged: false,
  params: [{
    key: "organizationId",
    label: "Organization ID",
    type: "string",
    required: true,
    hint: "The organization to watch.",
  }],
  input: (p) => ({ organizationId: String(p.organizationId ?? "").trim() }),
  output: ORGANIZER_OUTPUT,
  sample: T5_SAMPLE.organizers.organizers[0],
});

export default newOrganizer;
