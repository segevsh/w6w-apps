import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  courseId: number;
}

const courseGet: ActionDefinition<Input> = {
  key: "course-get",
  type: "read",
  resource: "course",
  title: "Get Course",
  description: "Fetch one course with its users, units, rules and prerequisites.",
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("courses", {
      id: input.courseId,
    });
  },
};

export default courseGet;
