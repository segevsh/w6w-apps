import { eventStreamTrigger } from "../lib/events.ts";

/** Voice Insights call summary, delivered through an Event Streams webhook sink. */
export default eventStreamTrigger({
  key: "call-summary-complete",
  title: "Call Summary Complete",
  description:
    "Fires when Twilio publishes the Voice Insights summary of a finished call to your Event Streams webhook. The run gets the call's summary data.",
  type: "com.twilio.voice.insights.call-summary.complete",
});
