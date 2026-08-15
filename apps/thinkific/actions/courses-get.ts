import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /courses/{id}` — a single Course by its numeric id. */
const coursesGet: ActionDefinition<Input> = {
  key: "courses-get",
  type: "read",
  resource: "courses",
  title: "Get Course",
  description: "Fetch a single Course by id.",
  params: [idParam("Course")],
  output: [
    { key: "id", type: "number", label: "Course ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "product_id", type: "number", label: "Product ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "chapter_ids", type: "array", label: "Chapter IDs" },
    { key: "instructor_id", type: "number", label: "Instructor ID" },
    { key: "reviews_enabled", type: "boolean", label: "Reviews enabled" },
  ],

  async execute(input, ctx) {
    return await new ThinkificClient(ctx).json(`/courses/${encodeURIComponent(input.id)}`);
  },
};

export default coursesGet;
