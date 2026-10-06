import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  courseId: number;
  deletedByUserId?: number;
}

const courseDelete: ActionDefinition<Input> = {
  key: "course-delete",
  type: "perform",
  resource: "course",
  title: "Delete Course",
  description: "Delete a course.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    {
      key: "deletedByUserId",
      label: "Deleted by user ID",
      type: "number",
      advanced: true,
      hint: "Defaults to the account's super-administrator.",
    },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).post("deletecourse", {
      course_id: input.courseId,
      deleted_by_user_id: input.deletedByUserId,
    });
  },
};

export default courseDelete;
