import { webhookTrigger } from "../lib/triggers.ts";

/** An appointment is updated (webhook event `AppointmentUpdate`). */
const appointmentUpdated = webhookTrigger({
  key: "appointment-updated",
  title: "Appointment Updated",
  description:
    "Fires when an appointment is updated in a HighLevel location (webhook event AppointmentUpdate). The run gets the location id, the appointment id, its contact id and the full payload with the appointment object (calendar, status, start and end time).",
  eventType: "AppointmentUpdate",
  sample: {
    type: "AppointmentUpdate",
    locationId: "sample-location-id",
    id: "sample-appointment-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "AppointmentUpdate",
      locationId: "sample-location-id",
      appointment: {
        id: "sample-appointment-id",
        title: "Appointment with the sales team",
        calendarId: "sample-calendar-id",
        contactId: "sample-contact-id",
        appointmentStatus: "confirmed",
        startTime: "2026-11-20T16:00:00+00:00",
        endTime: "2026-11-20T16:30:00+00:00",
      },
    },
  },
});

export default appointmentUpdated;
