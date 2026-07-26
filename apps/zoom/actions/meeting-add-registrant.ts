import type { ActionDefinition } from "@w6w/types";
import { unset, ZoomClient } from "../lib/client.ts";

interface Input {
  meetingId: string;
  email: string;
  firstName: string;
  lastName?: string;
  occurrenceIds?: string;
  autoApprove?: boolean;
}

/**
 * Registration has to be switched on for the meeting (`approval_type` 0 or 1)
 * or Zoom rejects the call.
 */
const meetingAddRegistrant: ActionDefinition<Input> = {
  key: "meeting-add-registrant",
  type: "perform",
  resource: "meetingRegistrant",
  title: "Add Meeting Registrant",
  description:
    "Register someone for a meeting. The meeting must have registration enabled. Returns their personal join URL.",
  // Re-registering the same email returns the same registrant rather than a
  // duplicate.
  idempotent: true,
  params: [
    { key: "meetingId", label: "Meeting ID", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", required: true, row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    {
      key: "occurrenceIds",
      label: "Occurrence IDs",
      type: "string",
      hint: "Comma-separated. Register for specific occurrences of a recurring meeting.",
    },
    {
      key: "autoApprove",
      label: "Auto approve",
      type: "boolean",
      hint: "Approve immediately on a meeting set to manual approval.",
    },
  ],
  output: [
    { key: "registrant_id", type: "string", label: "Registrant ID" },
    { key: "join_url", type: "string", label: "Personal join URL" },
    { key: "id", type: "number", label: "Meeting ID" },
  ],

  execute(input, ctx) {
    return new ZoomClient(ctx).request(
      `/meetings/${encodeURIComponent(input.meetingId)}/registrants`,
      {
        method: "POST",
        query: { occurrence_ids: unset(input.occurrenceIds) },
        body: {
          email: input.email,
          first_name: input.firstName,
          last_name: unset(input.lastName),
          auto_approve: input.autoApprove,
        },
      },
    );
  },
};

export default meetingAddRegistrant;
