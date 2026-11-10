import { callStatusTrigger } from "../lib/events.ts";

/** A status callback for a call you placed (initiated, ringing, answered, completed...). */
export default callStatusTrigger({
  key: "call-status",
  title: "Call Status Update",
  description:
    "Fires when Twilio reports a new status for a call whose status callback points here. The run gets the call SID, its status, direction and duration.",
});
