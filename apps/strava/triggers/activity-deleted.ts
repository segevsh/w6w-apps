import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "activity-deleted",
  title: "Activity Deleted",
  description: "The run gets each Strava activity an athlete deletes.",
  objectType: "activity",
  aspectType: "delete",
  sample: {
    aspectType: "delete",
    objectType: "activity",
    objectId: 1360128428,
    ownerId: 134815,
    eventTime: 1516126040,
    subscriptionId: 120475,
    updates: {},
  },
});
