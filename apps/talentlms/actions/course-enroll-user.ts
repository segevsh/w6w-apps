import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  userId?: number;
  userEmail?: string;
  courseId?: number;
  courseName?: string;
  role?: string;
}

const courseEnrollUser: ActionDefinition<Input> = {
  key: "course-enroll-user",
  type: "perform",
  resource: "course",
  title: "Enroll User in Course",
  description: "Enroll a user in a course, identified by ID or email and by ID or name.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", hint: "Or use the email below." },
    { key: "userEmail", label: "User email", type: "string" },
    { key: "courseId", label: "Course ID", type: "number", hint: "Or use the course name below." },
    { key: "courseName", label: "Course name", type: "string" },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [{ value: "learner", label: "Learner" }, {
        value: "instructor",
        label: "Instructor",
      }],
    },
  ],

  execute(input, ctx) {
    if (input.userId === undefined && !input.userEmail) {
      throw new Error("Give either a user ID or a user email.");
    }
    if (input.courseId === undefined && !input.courseName) {
      throw new Error("Give either a course ID or a course name.");
    }
    return new TalentLmsClient(ctx).post("addusertocourse", {
      user_id: input.userId,
      user_email: input.userEmail,
      course_id: input.courseId,
      course_name: input.courseName,
      role: input.role,
    });
  },
};

export default courseEnrollUser;
