import { EVENT_TYPES, resourceTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on `organization.deleted`. */
export default resourceTrigger({
  key: "organization-deleted",
  title: "Organization Deleted",
  description:
    "Fires when an organization is deleted in Zendesk. The run gets the organization as it was.",
  eventType: EVENT_TYPES.organizationDeleted,
  sample: {
    eventId: "b4fa7f87-a23a-407b-8e18-23493b6c3cb6",
    type: EVENT_TYPES.organizationDeleted,
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
