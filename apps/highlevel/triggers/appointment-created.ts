import { webhookTrigger } from "../lib/triggers.ts";

/** An appointment is booked (webhook event `AppointmentCreate`). */
const appointmentCreated = webhookTrigger({
  key: "appointment-created",
  title: "New Appointment",
  description:
    "Fires when an appointment is created in a HighLevel location (webhook event AppointmentCreate). The run gets the location id, the appointment id, its contact id and the full payload with the appointment object (calendar, status, start and end time).",
  eventType: "AppointmentCreate",
  sample: {
    type: "AppointmentCreate",
    locationId: "sample-location-id",
    id: "sample-appointment-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "AppointmentCreate",
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

export default appointmentCreated;
