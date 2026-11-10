import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "location-updated",
  title: "Location Updated",
  description: "Fires when a store location changes. The run gets the location as it is now.",
  topics: ["locations/update"],
  sampleResource: { id: 866550311766439000, name: "Warehouse 1", active: true, country_code: "US" },
});

export default trigger;
