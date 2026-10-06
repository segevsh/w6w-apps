import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  courseId: number;
  branchId: number;
}

const branchAddCourse: ActionDefinition<Input> = {
  key: "branch-add-course",
  type: "perform",
  resource: "branch",
  title: "Add Course to Branch",
  description: "Add a course to a branch.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "branchId", label: "Branch ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("addcoursetobranch", {
      course_id: input.courseId,
      branch_id: input.branchId,
    });
  },
};

export default branchAddCourse;
