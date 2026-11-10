import campaignList from "../actions/campaign-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each automated campaign that is new or changed, most recently updated first (`GET /v4/campaigns`; the action takes no page size, so one default page is read). Brief 9.1 (a), 9.2. */
export default feedTrigger({
  key: "new-or-updated-campaign",
  title: "New or Updated Campaign",
  description:
    "The run gets each automated campaign that is new or changed, most recently updated first (`GET /v4/campaigns`; the action takes no page size, so one default page is read).",
  action: campaignList,
  stamp: "updatedAt",
  paged: false,
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    uid: "campaign_1",
    name: "Review request",
    status: "active",
    updatedAt: "2026-11-10T12:00:00.000Z",
  },
});
