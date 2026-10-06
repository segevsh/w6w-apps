import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  userId: number;
  courseId: number;
}

const courseGoto: ActionDefinition<Input> = {
  key: "course-goto",
  type: "perform",
  resource: "course",
  title: "Get Course Login URL",
  description: "Mint a one-time URL that signs a user in and opens a course.",
  // Mints something new on every call, so a retry is not safe.
  idempotent: false,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "courseId", label: "Course ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("gotocourse", {
      user_id: input.userId,
      course_id: input.courseId,
    });
  },
};

export default courseGoto;
