import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /enrollments/{id}` — a single Enrollment by its numeric id. */
const enrollmentsGet: ActionDefinition<Input> = {
  key: "enrollments-get",
  type: "read",
  resource: "enrollments",
  title: "Get Enrollment",
  description: "Fetch a single Enrollment by id.",
  params: [idParam("Enrollment")],
  output: [
    { key: "id", type: "number", label: "Enrollment ID" },
    { key: "user_id", type: "number", label: "User ID" },
    { key: "user_email", type: "string", label: "User email" },
    { key: "course_id", type: "number", label: "Course ID" },
    { key: "course_name", type: "string", label: "Course name" },
    { key: "percentage_completed", type: "number", label: "Percentage completed (0.0-1.0)" },
    { key: "completed", type: "boolean", label: "Completed" },
    { key: "expired", type: "boolean", label: "Expired" },
    { key: "is_free_trial", type: "boolean", label: "Is free trial" },
    { key: "started_at", type: "string", label: "Started at" },
    { key: "activated_at", type: "string", label: "Activated at" },
    { key: "expiry_date", type: "string", label: "Expiry date" },
  ],

  async execute(input, ctx) {
    return await new ThinkificClient(ctx).json(`/enrollments/${encodeURIComponent(input.id)}`);
  },
};

export default enrollmentsGet;
