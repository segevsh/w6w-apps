import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "new-person",
  title: "New Person",
  description: "The run gets the id of each person created in Copper.",
  type: "person",
  event: "new",
  sample: {
    id: 123,
    type: "person",
    event: "new",
    subscriptionId: 17065,
    timestamp: "2026-11-09T12:00:00.000Z",
    updatedAttributes: null,
  },
});
