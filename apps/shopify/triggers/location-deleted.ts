import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "location-deleted",
  title: "Location Deleted",
  description:
    "Fires when a store location is deleted. The run gets the id of the deleted location.",
  topics: ["locations/delete"],
  sampleResource: { id: 866550311766439000 },
});

export default trigger;
