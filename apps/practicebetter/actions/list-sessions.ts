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
 * `GET /consultant/sessions` — list booked sessions.
 *
 * Security: `[read]`. Pagination is the shared four-control shape every list
 * endpoint here declares (see `lib/client.ts`).
 *
 * The filters are the ids the rest of this app hands back: `consultants`,
 * `records` and `services` (each an array of ids), `group` to narrow to group
 * sessions, and the `date_*` window. There is no free-text search parameter on
 * this operation, so a workflow that needs "sessions for this person" filters by
 * `records`, which is exactly the id `list-client-records` returns.
 */
interface Input extends PageInput {
  consultants?: string[] | string;
  records?: string[] | string;
  services?: string[] | string;
  group?: boolean;
  date_eq?: string;
  date_gte?: string;
  date_lte?: string;
}

const listSessions: ActionDefinition<Input, Page<unknown>> = {
  key: "list-sessions",
  type: "search",
  resource: "session",
  title: "List Sessions",
  description:
    "List booked sessions, filtered by consultant, client record, service, group/booked kind and " +
    "date window.",
  params: [
    ...pageParams,
    {
      key: "consultants",
      label: "Consultants",
      type: "multiselect",
      hint: "One or more consultant ids. Sent as repeated `consultants` query keys.",
    },
    {
      key: "records",
      label: "Client records",
      type: "multiselect",
      hint: "One or more client record ids — the id `list-client-records` returns.",
    },
    {
      key: "services",
      label: "Services",
      type: "multiselect",
      hint: "One or more service ids — the id `list-services` returns.",
    },
    {
      key: "group",
      label: "Group sessions only",
      type: "boolean",
      hint: "Narrow to group sessions (which have enrollees rather than a single record).",
    },
    { key: "date_eq", label: "Date", type: "datetime", hint: "Exact session date (date-time)." },
    {
      key: "date_gte",
      label: "On or after",
      type: "datetime",
      hint: "Lower bound on the session date (date-time).",
    },
    {
      key: "date_lte",
      label: "On or before",
      type: "datetime",
      hint: "Upper bound on the session date (date-time).",
    },
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).list("/consultant/sessions", {
      query: {
        ...pageQuery(input),
        consultants: toList(input.consultants),
        records: toList(input.records),
        services: toList(input.services),
        group: input.group,
        date_eq: input.date_eq,
        date_gte: input.date_gte,
        date_lte: input.date_lte,
      },
    });
  },
};

export default listSessions;
