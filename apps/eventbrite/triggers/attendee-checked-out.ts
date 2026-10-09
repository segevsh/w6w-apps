import { webhookTrigger } from "../lib/triggers.ts";

const attendeeCheckedOut = webhookTrigger({
  key: "attendee-checked-out",
  title: "Attendee Checked Out",
  description: "Fires when an attendee's barcode is scanned out. The run gets the attendee.",
  action: "attendee.checked_out",
});

export default attendeeCheckedOut;
