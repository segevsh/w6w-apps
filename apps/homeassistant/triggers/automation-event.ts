import { webhookTrigger } from "../lib/triggers.ts";

/** A Home Assistant automation calls the URL through `rest_command`. */
const automationEvent = webhookTrigger({
  key: "automation-event",
  title: "Automation Event",
  description:
    "Fires when a Home Assistant automation calls this trigger's URL through a rest_command action. The run gets the HTTP method, the content type, the query string and the body the automation sent: the JSON object or form fields, or the plain text.",
  sample: {
    method: "POST",
    contentType: "application/json",
    query: {},
    data: { event: "front_door_opened", entity_id: "binary_sensor.front_door", state: "on" },
    text: null,
  },
});

export default automationEvent;
