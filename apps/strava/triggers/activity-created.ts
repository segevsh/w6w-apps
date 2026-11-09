import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "activity-created",
  title: "Activity Created",
  description: "The run gets each activity a Strava athlete creates or uploads.",
  objectType: "activity",
  aspectType: "create",
  sample: {
    aspectType: "create",
    objectType: "activity",
    objectId: 1360128428,
    ownerId: 134815,
    eventTime: 1516126040,
    subscriptionId: 120475,
    updates: {},
  },
});
