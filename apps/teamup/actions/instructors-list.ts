/**
 * `GET /api/v2/instructors` — the people who teach.
 *
 * An instructor is the public-facing profile attached to events, which is not
 * the same record as a staff member (`staff-list`): `instructors-get` carries
 * the `staff` id when the two are linked, and many instructors have no login at
 * all.
 *
 * The filters are the useful joins. `events` takes comma-separated event ids
 * and returns the instructors on those events, `offering_type` restricts to
 * instructors who teach one class type, `content_collection` to a collection,
 * and `query` is a single loose search over the profile.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  query?: string;
  events?: string;
  offering_type?: number;
  content_collection?: number;
}

const action: ActionDefinition<Input> = {
  key: "instructors-list",
  type: "search",
  resource: "instructor",
  title: "List Instructors",
  description:
    "List the people who teach, filtered by event, class type, content collection or a loose search " +
    "(GET /api/v2/instructors).",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "One loose search over the instructor profile.",
    },
    {
      key: "events",
      label: "Event IDs",
      type: "string",
      hint: "Comma-separated event ids — the instructors on those events.",
    },
    {
      key: "offering_type",
      label: "Offering type ID",
      type: "number",
      validation: { integer: true },
      hint: "Only instructors who teach this class type.",
    },
    {
      key: "content_collection",
      label: "Content collection ID",
      type: "number",
      validation: { integer: true },
    },
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/instructors", {
      query: {
        ...paginationQuery(input),
        query: input.query,
        events: input.events,
        offering_type: input.offering_type,
        content_collection: input.content_collection,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
