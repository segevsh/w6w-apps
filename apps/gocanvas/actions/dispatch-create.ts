import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GoCanvasClient } from "../lib/client.ts";
import { departmentIdParam, idParam, optionalIdParam } from "../lib/params.ts";

interface Input {
  dispatchType: string;
  formId: number;
  assigneeId?: number;
  departmentId?: number;
  name?: string;
  description?: string;
  responses?: unknown;
  sendNotification?: boolean;
  scheduledAt?: string;
  scheduledEnd?: string;
  reminderInterval?: number;
  sendCalendarInvite?: boolean;
  noFormAssignment?: boolean;
  repeatInterval?: string;
  repeatEndsOption?: string;
  repeatEndsOn?: string;
  repeatOccurrences?: number;
}

const dispatchCreate: ActionDefinition<Input> = {
  key: "dispatch-create",
  type: "perform",
  resource: "dispatch",
  title: "Create Dispatch",
  description:
    'Send a pre-filled form to a mobile user: immediately, at a scheduled time, or on a recurring schedule. responses pre-populate the assignee\'s submission ({ entry_id | entry_guid, value }). Media fields cannot be dispatched. Scheduled times use "MM/DD/YYYY HH:mm:ss AM".',
  idempotent: false,
  params: [
    {
      key: "dispatchType",
      label: "Dispatch type",
      type: "select",
      required: true,
      options: [{ value: "immediate_dispatch", label: "immediate_dispatch" }, {
        value: "scheduled_dispatch",
        label: "scheduled_dispatch",
      }, { value: "recurring_dispatch", label: "recurring_dispatch" }],
    },
    idParam("formId", "Form ID"),
    optionalIdParam(
      "assigneeId",
      "Assignee user ID",
      "Leave empty to create the dispatch unassigned.",
    ),
    departmentIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "responses",
      label: "Responses",
      type: "json",
      hint: 'JSON array, e.g. [{"entry_id": 4506586, "value": "Jane"}].',
    },
    {
      key: "sendNotification",
      label: "Send push notification",
      type: "boolean",
      hint: "Immediate dispatches.",
    },
    {
      key: "scheduledAt",
      label: "Scheduled start",
      type: "string",
      hint: 'Required for scheduled and recurring dispatches, format "MM/DD/YYYY HH:mm:ss AM".',
    },
    {
      key: "scheduledEnd",
      label: "Scheduled end",
      type: "string",
      hint: "Required for scheduled and recurring dispatches.",
    },
    optionalIdParam(
      "reminderInterval",
      "Reminder minutes",
      "Minutes before the event to send a reminder; required for scheduled dispatches.",
    ),
    { key: "sendCalendarInvite", label: "Send calendar invite", type: "boolean" },
    {
      key: "noFormAssignment",
      label: "Skip form assignment",
      type: "boolean",
      hint: "Allow dispatching to a user who is not assigned to the form.",
    },
    {
      key: "repeatInterval",
      label: "Repeat interval",
      type: "select",
      options: [
        { value: "daily", label: "daily" },
        { value: "weekdays", label: "weekdays" },
        { value: "weekly", label: "weekly" },
        { value: "monthly_day", label: "monthly_day" },
        { value: "monthly_date", label: "monthly_date" },
        { value: "yearly", label: "yearly" },
      ],
      hint: "Recurring dispatches only.",
    },
    {
      key: "repeatEndsOption",
      label: "Repeat ends",
      type: "select",
      options: [{ value: "ends_after", label: "ends_after" }, {
        value: "ends_on",
        label: "ends_on",
      }],
      hint: "Recurring dispatches only.",
    },
    {
      key: "repeatEndsOn",
      label: "Repeat end date",
      type: "string",
      hint: "MM/DD/YYYY; required when repeat ends is ends_on.",
    },
    optionalIdParam(
      "repeatOccurrences",
      "Repeat occurrences",
      "Required when repeat ends is ends_after.",
    ),
  ],
  output: [
    { key: "data", type: "object", label: "The created dispatch" },
  ],

  execute(input, ctx) {
    const type = input.dispatchType;
    if (type === "scheduled_dispatch" || type === "recurring_dispatch") {
      if (!input.scheduledAt || !input.scheduledEnd) {
        throw new Error(`${type} needs scheduledAt and scheduledEnd`);
      }
    }
    if (type === "scheduled_dispatch" && input.reminderInterval === undefined) {
      throw new Error("scheduled_dispatch needs reminderInterval");
    }
    if (type === "recurring_dispatch" && (!input.repeatInterval || !input.repeatEndsOption)) {
      throw new Error("recurring_dispatch needs repeatInterval and repeatEndsOption");
    }
    return new GoCanvasClient(ctx).request("/dispatches", {
      method: "POST",
      body: compact({
        dispatch_type: type,
        form_id: input.formId,
        assignee_id: input.assigneeId,
        department_id: input.departmentId,
        name: input.name,
        description: input.description,
        responses: asOptionalJson(input.responses, "responses"),
        send_notification: input.sendNotification,
        scheduled_at: input.scheduledAt,
        scheduled_end: input.scheduledEnd,
        reminder_interval: input.reminderInterval,
        send_calendar_invite: input.sendCalendarInvite,
        no_form_assignment: input.noFormAssignment,
        repeat_interval: input.repeatInterval,
        repeat_ends_option: input.repeatEndsOption,
        repeat_ends_on: input.repeatEndsOn,
        repeat_occurrences: input.repeatOccurrences,
      }),
    });
  },
};

export default dispatchCreate;
