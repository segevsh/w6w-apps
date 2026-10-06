import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  courseId: number;
  groupId: number;
}

const groupAddCourse: ActionDefinition<Input> = {
  key: "group-add-course",
  type: "perform",
  resource: "group",
  title: "Add Course to Group",
  description: "Add a course to a group.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "groupId", label: "Group ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("addcoursetogroup", {
      course_id: input.courseId,
      group_id: input.groupId,
    });
  },
};

export default groupAddCourse;
