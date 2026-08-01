import type { ActionDefinition } from "@w6w/types";
import { AcuityClient } from "../lib/client.ts";

interface Input {
  id: number;
  pastFormAnswers?: boolean;
}

/**
 * GET /appointments/{id} — a single appointment by numeric ID.
 */
const appointmentGet: ActionDefinition<Input> = {
  key: "appointment-get",
  type: "read",
  resource: "appointment",
  title: "Get Appointment",
  description: "Fetch a single appointment by ID (GET /appointments/{id}).",
  params: [
    { key: "id", label: "Appointment ID", type: "number", required: true },
    {
      key: "pastFormAnswers",
      label: "Include past form answers",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Include previous answers given to the appointment's intake forms.",
    },
  ],

  execute(input, ctx) {
    return new AcuityClient(ctx).request(`/appointments/${encodeURIComponent(input.id)}`, {
      query: { pastFormAnswers: input.pastFormAnswers },
    });
  },
};

export default appointmentGet;
