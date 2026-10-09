import { webhookTrigger } from "../lib/triggers.ts";

const attendeeCheckedIn = webhookTrigger({
  key: "attendee-checked-in",
  title: "Attendee Checked In",
  description:
    "Fires when an attendee's barcode is scanned in at the door. The run gets the attendee.",
  action: "attendee.checked_in",
});

export default attendeeCheckedIn;
