import { pollFromListAction } from "../../_shared/poll/mod.ts";
import activityList from "../actions/activity-list.ts";

interface Activity {
  activityId: string | number;
  occurredAt?: string;
  sentAt?: string;
  createdAt?: string;
}

/**
 * `GET /activity` returns the user's email and call activity "newest first", one item per email
 * thread or call reflecting its most recent event
 * (https://docs.seamless.ai/api-reference/v2/activity/retrieve-the-activity-feed).
 */
export default pollFromListAction({
  key: "new-activity",
  title: "New Activity",
  description: "The run gets each email or call thread that first appears in the activity feed.",
  action: activityList,
  input: (params) => ({ ...params, limit: 50, offset: 0 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as Activity).activityId),
  params: (activityList.params ?? []).filter((p) =>
    p.key === "contactId" || p.key === "campaignIdentifier"
  ),
  output: [
    { key: "activityId", type: "string", label: "Activity ID" },
    { key: "eventType", type: "string", label: "Event type" },
    { key: "resourceType", type: "string", label: "Resource type (email or call)" },
    { key: "direction", type: "string", label: "Direction" },
    { key: "contactId", type: "string", label: "Contact ID" },
    { key: "campaignId", type: "string", label: "Campaign ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "occurredAt", type: "string", label: "Occurred at" },
  ],
  sample: {
    activityId: "9001",
    eventType: "email_sent",
    resourceType: "email",
    direction: "outbound",
    contactId: "48213377",
    subject: "Quick question",
    occurredAt: "2026-11-10T09:00:00.000Z",
  },
  maxPages: 1,
});
