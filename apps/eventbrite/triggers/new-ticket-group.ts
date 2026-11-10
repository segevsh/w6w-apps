import { snapshotTrigger } from "../lib/polls.ts";
import listTicketGroups from "../actions/list-ticket-groups.ts";
import { T5_SAMPLE, TICKET_GROUP_OUTPUT } from "../lib/outputs.ts";

/**
 * Eventbrite sends no webhook for ticket groups, and an organization has a handful of them, so the
 * whole list (`GET /organizations/{id}/ticket_groups/?status=live`, read by `list-ticket-groups`)
 * is compared check to check. https://www.eventbrite.com/platform/api (verified 2026-11-10).
 */
const newTicketGroup = snapshotTrigger({
  key: "new-ticket-group",
  title: "New Ticket Group",
  description:
    "Checks an organization's live ticket groups on a schedule. The run gets each ticket group created since the previous check: its name, status and ticket classes.",
  action: listTicketGroups,
  list: "ticket_groups",
  paged: true,
  params: [{
    key: "organizationId",
    label: "Organization ID",
    type: "string",
    required: true,
    hint: "The organization to watch.",
  }],
  input: (p) => ({ organizationId: String(p.organizationId ?? "").trim(), status: "live" }),
  output: TICKET_GROUP_OUTPUT,
  sample: T5_SAMPLE.ticketGroups.ticket_groups[0],
});

export default newTicketGroup;
