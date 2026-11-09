import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "activity-updated",
  title: "Activity Updated",
  description: "The run gets each change to a Strava activity, with the fields that changed.",
  objectType: "activity",
  aspectType: "update",
  sample: {
    aspectType: "update",
    objectType: "activity",
    objectId: 1360128428,
    ownerId: 134815,
    eventTime: 1516126040,
    subscriptionId: 120475,
    updates: { title: "Messy" },
  },
});
