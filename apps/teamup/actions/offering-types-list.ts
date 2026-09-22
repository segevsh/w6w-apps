/**
 * `GET /api/v2/offering_types` — the class types the business sells.
 *
 * An offering type is the product behind a class: Yoga, Spin, Personal
 * Training. Events and course sessions point at one (`offering_type`) and
 * `memberships-list` can be filtered by one, so this is the vocabulary those
 * ids resolve against — the step that turns an id in a report into a word.
 *
 * The filters are joins and lookups: `instructor` returns the types an
 * instructor teaches, `has_active_sessions` the ones with something scheduled,
 * `is_age_restricted` the age-gated ones, `name_contains` a loose lookup, and
 * `schedule_type` TeamUp's own classification (passed through as TeamUp spells
 * it). `id` is documented as a query filter on this list operation and is
 * forwarded as given.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  status?: string;
  name_contains?: string;
  schedule_type?: string;
  instructor?: number;
  has_active_sessions?: boolean;
  is_age_restricted?: boolean;
  id?: number;
}

const action: ActionDefinition<Input> = {
  key: "offering-types-list",
  type: "search",
  resource: "offering-type",
  title: "List Offering Types",
  description:
    "List the class and session types a business sells — Yoga, Spin, Personal Training — with the " +
    "filters that resolve them (GET /api/v2/offering_types).",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "The offering type's status, as TeamUp spells it.",
    },
    { key: "name_contains", label: "Name contains", type: "string", hint: "Loose lookup by name." },
    {
      key: "schedule_type",
      label: "Schedule type",
      type: "string",
      hint: "TeamUp's schedule classification.",
    },
    {
      key: "instructor",
      label: "Instructor ID",
      type: "number",
      validation: { integer: true },
      hint: "The types this instructor teaches.",
    },
    {
      key: "has_active_sessions",
      label: "Has active sessions",
      type: "boolean",
      hint: "Only types with something scheduled.",
    },
    {
      key: "is_age_restricted",
      label: "Age restricted only",
      type: "boolean",
      hint: "Only age-gated types.",
    },
    {
      key: "id",
      label: "Offering type ID",
      type: "number",
      validation: { integer: true },
      hint: "Filter by id, as this operation documents it.",
    },
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/offering_types", {
      query: {
        ...paginationQuery(input),
        status: input.status,
        name_contains: input.name_contains,
        schedule_type: input.schedule_type,
        instructor: input.instructor,
        has_active_sessions: input.has_active_sessions,
        is_age_restricted: input.is_age_restricted,
        id: input.id,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
