import { EVENT_TYPES, resourceTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on `organization.created`. */
export default resourceTrigger({
  key: "new-organization",
  title: "New Organization",
  description:
    "Fires when an organization is created in Zendesk. The run gets the new organization and the event that announced it.",
  eventType: EVENT_TYPES.organizationCreated,
  sample: {
    eventId: "a540ab78-88f2-49e1-93a7-16152a6f782c",
    type: EVENT_TYPES.organizationCreated,
    time: "2025-07-04T05:33:18Z",
    accountId: "18763612",
    resourceId: "6607619104125",
    subject: "zen:organization:6607619104125",
    detail: {
      id: "6607619104125",
      name: "Acme",
      shared_comments: false,
      shared_tickets: false,
      created_at: "2025-07-07T03:44:13Z",
      updated_at: "2025-07-07T03:44:13Z",
    },
    event: {},
  },
});
