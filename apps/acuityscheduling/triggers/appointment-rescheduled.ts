import { webhookTrigger } from "../lib/triggers.ts";

/** An appointment is moved. */
const appointmentRescheduled = webhookTrigger({
  key: "appointment-rescheduled",
  title: "Appointment Rescheduled",
  description:
    "Fires when an Acuity Scheduling appointment is rescheduled. The run gets the appointment at its new time.",
  action: "rescheduled",
});

export default appointmentRescheduled;
