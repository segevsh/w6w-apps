import { webhookTrigger } from "../lib/triggers.ts";

/** An appointment is deleted (webhook event `AppointmentDelete`). */
const appointmentDeleted = webhookTrigger({
  key: "appointment-deleted",
  title: "Appointment Deleted",
  description:
    "Fires when an appointment is deleted in a HighLevel location (webhook event AppointmentDelete). The run gets the location id, the id of the deleted appointment, its contact id and the payload as it was.",
  eventType: "AppointmentDelete",
  sample: {
    type: "AppointmentDelete",
    locationId: "sample-location-id",
    id: "sample-appointment-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "AppointmentDelete",
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

export default appointmentDeleted;
