import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "location-created",
  title: "Location Created",
  description: "Fires when a store location is created. The run gets the location.",
  topics: ["locations/create"],
  sampleResource: { id: 866550311766439000, name: "Warehouse 1", active: true, country_code: "US" },
});

export default trigger;
