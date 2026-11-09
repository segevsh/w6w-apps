import { webhookTrigger } from "../lib/triggers.ts";

/** A new appointment is booked. */
const appointmentScheduled = webhookTrigger({
  key: "appointment-scheduled",
  title: "Appointment Scheduled",
  description:
    "Fires when an appointment is booked in Acuity Scheduling. The run gets the appointment with the client, time, type, calendar and intake form answers.",
  action: "scheduled",
});

export default appointmentScheduled;
