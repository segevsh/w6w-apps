import type { ActionDefinition } from "@w6w/types";
import { flag, TalentLmsClient } from "../lib/client.ts";

interface Input {
  courseId: number;
  userId: number;
  removeCertification?: boolean;
}

const courseResetUserProgress: ActionDefinition<Input> = {
  key: "course-reset-user-progress",
  type: "perform",
  resource: "course",
  title: "Reset User Progress",
  description: "Reset a user's progress in a course.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "removeCertification", label: "Remove certification", type: "boolean", advanced: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("resetuserprogress", {
      course_id: input.courseId,
      user_id: input.userId,
      remove_certification: flag(input.removeCertification, "yes", "no"),
    });
  },
};

export default courseResetUserProgress;
