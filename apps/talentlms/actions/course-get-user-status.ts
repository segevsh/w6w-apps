import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  courseId: number;
  userId: number;
}

const courseGetUserStatus: ActionDefinition<Input> = {
  key: "course-get-user-status",
  type: "read",
  resource: "course",
  title: "Get User Status in Course",
  description: "A user's role, completion and per-unit progress in a course.",
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("getuserstatusincourse", {
      course_id: input.courseId,
      user_id: input.userId,
    });
  },
};

export default courseGetUserStatus;
