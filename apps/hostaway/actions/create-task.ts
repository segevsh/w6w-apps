import type { ActionDefinition } from "@w6w/types";
import { asNumber, asText, compact, HostawayClient } from "../lib/client.ts";

/**
 * Create a task. Wraps `POST /v1/tasks`.
 *
 * "A task object should be provided in the request body." Response: "Created task
 * object or error response."
 *
 * The documented Task object's Property table marks exactly one field required —
 * `title` ("yes, string, Title") — and everything else optional, so that is the only
 * field enforced here. The optional fields below are all named in that table:
 * `listingMapId`, `reservationId`, `assigneeUserId`, `description`, `canStartFrom`
 * ("Start time"), `shouldEndBy` ("End time"), `status` ("Can be one of the following:
 * pending, confirmed, inProgress, completed, cancelled"), `priority`, `cost`,
 * `costCurrency`, `costDescription` and `color` ("Color in hex format (#000000)").
 */
const action: ActionDefinition = {
  key: "create-task",
  type: "perform",
  resource: "task",
  title: "Create a task",
  description: "Create a task, optionally attached to a listing or reservation.",
  // Each call creates a new task; retrying a failed call creates a second one.
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "listingMapId", label: "Listing ID", type: "number" },
    { key: "reservationId", label: "Reservation ID", type: "number" },
    { key: "assigneeUserId", label: "Assignee user ID", type: "number" },
    { key: "description", label: "Description", type: "text" },
    { key: "canStartFrom", label: "Start time", type: "datetime" },
    { key: "shouldEndBy", label: "End time", type: "datetime" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "", label: "Hostaway default (pending)" },
        { value: "pending", label: "Pending" },
        { value: "confirmed", label: "Confirmed" },
        { value: "inProgress", label: "In progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    { key: "priority", label: "Priority", type: "number" },
    { key: "cost", label: "Cost", type: "number" },
    { key: "costCurrency", label: "Cost currency", type: "string" },
    { key: "costDescription", label: "Cost description", type: "string" },
    { key: "color", label: "Color", type: "string", hint: "Hex format, e.g. #000000." },
  ],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "listingMapId", type: "number", label: "Listing ID" },
    { key: "reservationId", type: "number", label: "Reservation ID" },
    { key: "assigneeUserId", type: "number", label: "Assignee user ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const title = asText(p.title);
    if (!title) throw new Error("`title` is required");

    const body = compact({
      title,
      listingMapId: asNumber(p.listingMapId),
      reservationId: asNumber(p.reservationId),
      assigneeUserId: asNumber(p.assigneeUserId),
      description: asText(p.description),
      canStartFrom: asText(p.canStartFrom),
      shouldEndBy: asText(p.shouldEndBy),
      status: asText(p.status),
      priority: asNumber(p.priority),
      cost: asNumber(p.cost),
      costCurrency: asText(p.costCurrency),
      costDescription: asText(p.costDescription),
      color: asText(p.color),
    });

    return await new HostawayClient(ctx).request("/tasks", { method: "POST", body });
  },
};

export default action;
