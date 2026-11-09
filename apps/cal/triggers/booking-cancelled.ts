import { webhookTrigger } from "../lib/triggers.ts";

/** A booking is cancelled. */
const bookingCancelled = webhookTrigger({
  key: "booking-cancelled",
  title: "Booking Cancelled",
  description:
    "Fires when a Cal.com booking is cancelled. The run gets the booking, who attended and the cancellation reason.",
  triggerEvent: "BOOKING_CANCELLED",
});

export default bookingCancelled;
