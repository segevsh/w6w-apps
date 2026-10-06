import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  userId: number;
  courseId: number;
}

const courseUnenrollUser: ActionDefinition<Input> = {
  key: "course-unenroll-user",
  type: "perform",
  resource: "course",
  title: "Un-enroll User from Course",
  description: "Remove a user from a course.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "courseId", label: "Course ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("removeuserfromcourse", {
      user_id: input.userId,
      course_id: input.courseId,
    });
  },
};

export default courseUnenrollUser;
