import type { ActionDefinition } from "@w6w/types";
import {
  type Page,
  type PageInput,
  pageOutput,
  pageParams,
  pageQuery,
  PracticeBetterClient,
  toList,
} from "../lib/client.ts";

/**
 * `GET /consultant/reminders` — list reminders.
 *
 * Security: `[read]`. Pagination is the shared four-control shape every list
 * endpoint here declares (see `lib/client.ts`).
 *
 * The document's own summary for this operation says "List Tasks" while the path
 * and its `Reminder` schema both say reminder — the same object under two
 * names, so this app keeps the path's vocabulary and says so here rather than
 * guessing which one the caller knows it by.
 *
 * `type` is typed in the document as an array of the `ReminderType` `{name,
 * value}` enum; the names are not published, so they are taken as free text and
 * sent as repeated query keys. `team_for` and the two id lists scope the answer
 * to the people the reminder is for.
 */
interface Input extends PageInput {
  completed?: boolean;
  consultants?: string[] | string;
  records?: string[] | string;
  team_for?: string;
  type?: string[] | string;
}

const listReminders: ActionDefinition<Input, Page<unknown>> = {
  key: "list-reminders",
  type: "search",
  resource: "reminder",
  title: "List Reminders",
  description:
    'List reminders (the document\'s summary calls this operation "List Tasks"), filtered by ' +
    "completion, consultant, client record, team recipient and type.",
  params: [
    ...pageParams,
    {
      key: "completed",
      label: "Completed",
      type: "boolean",
      hint: "Filter by completion — set false for the ones still outstanding.",
    },
    {
      key: "consultants",
      label: "Consultants",
      type: "multiselect",
      hint: "One or more consultant ids.",
    },
    {
      key: "records",
      label: "Client records",
      type: "multiselect",
      hint: "One or more client record ids.",
    },
    {
      key: "team_for",
      label: "Team for",
      type: "string",
      hint: "Scope the list to reminders belonging to this team recipient.",
    },
    {
      key: "type",
      label: "Types",
      type: "multiselect",
      hint:
        "One or more `ReminderType` names. The document does not publish the name list, so they are " +
        "typed by hand; each is sent as a repeated `type` query key.",
    },
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).list("/consultant/reminders", {
      query: {
        ...pageQuery(input),
        completed: input.completed,
        consultants: toList(input.consultants),
        records: toList(input.records),
        team_for: input.team_for,
        type: toList(input.type),
      },
    });
  },
};

export default listReminders;
