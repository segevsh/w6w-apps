import { webhookTrigger } from "../lib/triggers.ts";

/** An appointment is canceled. */
const appointmentCanceled = webhookTrigger({
  key: "appointment-canceled",
  title: "Appointment Canceled",
  description:
    "Fires when an Acuity Scheduling appointment is canceled. The run gets the appointment that was canceled.",
  action: "canceled",
});

export default appointmentCanceled;
