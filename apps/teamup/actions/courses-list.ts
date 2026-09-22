/**
 * `GET /api/v2/courses` — multi-session programmes.
 *
 * A course is the container: a programme that runs over several sessions,
 * distinct from the single `events` the class schedule is made of. Its sessions
 * are `course_sessions` (`course-sessions-list`), and the course id carried on a
 * session is how a workflow walks from one to the other.
 *
 * `published` is the one documented filter and the one that matters most of the
 * time: an unpublished course is still being set up, so a workflow looking for
 * something to advertise keeps it on.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  published?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "courses-list",
  type: "search",
  resource: "course",
  title: "List Courses",
  description:
    "List multi-session courses, optionally only the published ones (GET /api/v2/courses).",
  params: [
    {
      key: "published",
      label: "Published",
      type: "boolean",
      hint: "Only courses that are published.",
    },
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/courses", {
      query: {
        ...paginationQuery(input),
        published: input.published,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
