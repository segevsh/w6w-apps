import type { ActionDefinition } from "@w6w/types";
import { BambooClient, compact } from "../lib/client.ts";

interface Input {
  requestId: string;
  status: string;
  note?: string;
}

/**
 * `PUT /api/v1/time_off/requests/{requestId}/status` — approve, deny or cancel.
 *
 * The status vocabulary here is NOT the same as the one on create. The schema
 * enumerates `["approved", "denied", "declined", "canceled", "cancelled"]` —
 * `canceled` appears (it does not on create), `requested` does not, and both
 * spellings of denied/declined and canceled/cancelled are accepted. The options
 * list mirrors the schema exactly rather than tidying the duplicates away,
 * because a workflow passing through a value it read from a request payload
 * should not hit a validation error this app invented.
 *
 * Who may do what is documented: "Owner/admins can approve out of turn by
 * completing all workflow steps at once; other approvers complete only their
 * current step." So the same call means different things depending on the key —
 * a full approval for an admin, one step for a regular approver. Worth knowing
 * before wiring this into an automation that assumes the request is finished.
 *
 * `idempotent: true` — setting a request to `approved` twice leaves it approved.
 * Retrying after a network failure is safe.
 */
const updateTimeOffRequestStatus: ActionDefinition<Input> = {
  key: "update-time-off-request-status",
  type: "perform",
  resource: "time-off-request",
  title: "Update Time Off Request Status",
  description: "Approve, deny or cancel an existing time off request, optionally with a note. An " +
    "owner/admin completes the whole approval workflow at once; another approver completes only " +
    "their own step.",
  idempotent: true,
  params: [
    {
      key: "requestId",
      label: "Request ID",
      type: "string",
      required: true,
      hint: "The time off request ID, from the List Time Off Requests action.",
    },
    {
      key: "status",
      label: "New status",
      type: "select",
      required: true,
      options: [
        { value: "approved", label: "Approved" },
        { value: "denied", label: "Denied" },
        { value: "declined", label: "Declined (synonym for denied)" },
        { value: "canceled", label: "Canceled" },
        { value: "cancelled", label: "Cancelled (alternative spelling)" },
      ],
      hint: "Note this vocabulary differs from the create action: `canceled` is valid here and " +
        "`requested` is not.",
    },
    {
      key: "note",
      label: "Note",
      type: "text",
      hint: "Optional note attached to the status change.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (200 on success)" }],

  async execute(input, ctx) {
    await new BambooClient(ctx).request(
      `/time_off/requests/${encodeURIComponent(input.requestId)}/status`,
      { method: "PUT", body: compact({ status: input.status, note: input.note }) },
    );
    return { status: 200 };
  },
};

export default updateTimeOffRequestStatus;
