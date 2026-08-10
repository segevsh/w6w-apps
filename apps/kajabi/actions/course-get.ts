import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, resourceOutput } from "../lib/params.ts";

/** `GET /v1/courses/{id}` — one course. */
interface Input {
  id: string;
  fields?: string;
}

const courseGet: ActionDefinition<Input> = {
  key: "course-get",
  type: "read",
  resource: "course",
  title: "Get Course",
  description: "Fetch one course by id.",
  params: [
    idParam("Course ID", "`course-list` returns the ids."),
    fieldsParam("courses", "title"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/courses/${encodeURIComponent(input.id)}`, {
      query: { "fields[courses]": unset(input.fields) },
    });
  },
};

export default courseGet;
