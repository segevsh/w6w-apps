import { webhookTrigger } from "../lib/triggers.ts";

/** Rendex Watch alerts: the page changed, a failing watch recovered, or a watch started failing. */
const watchEvent = webhookTrigger({
  key: "watch-event",
  title: "Watch Alert",
  description:
    "Fires when a Rendex Watch detects a change, recovers from failing, or starts failing. The run gets the event, watch and run ids, the watched URL, a one-line summary, the diff score, the added and removed text lines, short-lived before, after, overlay and crop image links, and the error for a failure.",
});

export default watchEvent;
