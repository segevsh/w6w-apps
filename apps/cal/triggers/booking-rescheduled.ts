import { webhookTrigger } from "../lib/triggers.ts";

/** A booking is moved. */
const bookingRescheduled = webhookTrigger({
  key: "booking-rescheduled",
  title: "Booking Rescheduled",
  description:
    "Fires when a Cal.com booking is rescheduled. The run gets the new booking, its time and the reschedule reference.",
  triggerEvent: "BOOKING_RESCHEDULED",
});

export default bookingRescheduled;
