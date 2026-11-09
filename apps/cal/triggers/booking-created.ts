import { webhookTrigger } from "../lib/triggers.ts";

/** A booking is made. */
const bookingCreated = webhookTrigger({
  key: "booking-created",
  title: "Booking Created",
  description:
    "Fires when someone books a Cal.com meeting. The run gets the booking, its time, the organizer, the attendees and their form responses.",
  triggerEvent: "BOOKING_CREATED",
});

export default bookingCreated;
