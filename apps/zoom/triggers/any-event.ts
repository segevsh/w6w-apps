import { zoomTrigger } from "../lib/events.ts";

export default zoomTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on the Zoom events you list (leave it empty for every event your app is subscribed to). The run gets the event and its object.",
});
