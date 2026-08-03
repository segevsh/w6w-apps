import type { ActionDefinition } from "@w6w/types";
import {
  CloseClient,
  type CloseList,
  compact,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  leadId?: string;
  assignedTo?: string;
  isComplete?: boolean;
  type?: string;
  dateLte?: string;
  dateGte?: string;
  orderBy?: string;
}

/**
 * `GET /task/` — offset-paginated list of Tasks.
 *
 * Three things about this endpoint are easy to get wrong, and all three are
 * Close's documented behaviour rather than this app's choices:
 *
 * **1. It does not list all tasks by default.** "When not filtering by `_type`,
 * only `lead` tasks are returned." So the unfiltered call silently hides missed
 * calls, voicemails, incoming emails and everything else. `_type=all` is the
 * only way to see the real inbox, which is why the `type` param says so and why
 * `all` is offered as an explicit choice rather than left to be guessed.
 *
 * **2. `due_date` is deprecated.** Close's Tasks page states it outright: "The
 * `due_date` field is deprecated and should not be used." The live field is
 * `date` — "when the task is actionable and appears in the inbox" — so this
 * action filters on `date__gte` / `date__lte`. The endpoint still *accepts*
 * `due_date__*`, which is exactly why building against it is a trap.
 *
 * **3. `date` is date-or-datetime.** Both `2015-01-05` and
 * `2015-01-10T05:00:00+00:00` are valid, and Close orders date-only tasks before
 * date-time tasks on the same day.
 *
 * `is_complete` is what makes this a work queue: incomplete tasks are the rep's
 * inbox, complete ones the archive. `isComplete: false` plus a `dateLte` of
 * today is the "what is overdue" query.
 */
const listTasks: ActionDefinition<Input> = {
  key: "list-tasks",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description:
    "List Tasks, filtered by lead, assignee, completion state or date. Note Close returns ONLY " +
    "`lead` tasks unless you set a type — use `all` to see every kind.",
  params: [
    { key: "leadId", label: "Lead ID", type: "string", placeholder: "lead_..." },
    {
      key: "assignedTo",
      label: "Assigned to (User ID)",
      type: "string",
      placeholder: "user_...",
      hint: "Get ids from the List Users action.",
    },
    {
      key: "isComplete",
      label: "Is complete",
      type: "boolean",
      hint: "False is the rep's inbox, true the archive. Omit and Close returns both. Note Close " +
        "auto-deletes archived tasks of some types after a while.",
    },
    {
      key: "type",
      label: "Task type",
      type: "select",
      options: [
        { value: "all", label: "All types" },
        { value: "lead", label: "Lead (to-do)" },
        { value: "incoming_email", label: "Incoming email" },
        { value: "email_followup", label: "Email follow-up" },
        { value: "missed_call", label: "Missed call" },
        { value: "answered_detached_call", label: "Answered detached call" },
        { value: "voicemail", label: "Voicemail" },
        { value: "opportunity_due", label: "Opportunity due" },
        { value: "incoming_sms", label: "Incoming SMS" },
        { value: "outgoing_call", label: "Outgoing call" },
      ],
      hint: "IMPORTANT: leave this empty and Close returns `lead` tasks ONLY, not everything. " +
        "Choose `all` for the full inbox.",
    },
    {
      key: "dateGte",
      label: "Actionable on or after",
      type: "string",
      placeholder: "2026-01-05",
      hint: "Maps to `date__gte`. Date (`2026-01-05`) or date-time " +
        "(`2026-01-05T05:00:00+00:00`). Close's `due_date` is deprecated — this is the live field.",
    },
    {
      key: "dateLte",
      label: "Actionable on or before",
      type: "string",
      placeholder: "2026-01-05",
      hint: "Maps to `date__lte`. Set it to today, with `isComplete` false, for an overdue queue.",
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      placeholder: "date",
      hint: "Field to sort by (`_order_by`). Prefix with `-` to reverse.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new CloseClient(ctx).request<CloseList>("/task/", {
      query: compact({
        ...pageQuery(input),
        lead_id: input.leadId,
        assigned_to: input.assignedTo,
        is_complete: input.isComplete,
        _type: input.type,
        date__gte: input.dateGte,
        date__lte: input.dateLte,
        _order_by: input.orderBy,
      }),
    });
  },
};

export default listTasks;
