import type { Param } from "@w6w/types";
import { requireParam, webhookTrigger } from "../lib/triggers.ts";

const COURSE: Param = {
  key: "courseId",
  label: "Course ID",
  type: "string",
  required: true,
  hint: "The course to watch for completions (Get Courses lists the ids).",
};

/** A user completes a course (action `COURSE_COMPLETED`, filter `courseID`). */
const courseCompleted = webhookTrigger({
  key: "course-completed",
  title: "Course Completed",
  description:
    "Fires when a user completes the chosen course (action COURSE_COMPLETED). The run gets the course id and name and the user id.",
  action: "COURSE_COMPLETED",
  params: [COURSE],
  filter: (p) => ({ courseID: requireParam(p, "courseId", "course ID") }),
  output: [
    { key: "courseID", type: "string", label: "Course ID" },
    { key: "courseName", type: "string", label: "Course name" },
    { key: "userID", type: "string", label: "User ID" },
  ],
  sample: {
    action: "COURSE_COMPLETED",
    courseID: "7c1d3e52-6d2a-4c58-8f0e-2a9b6f1d3c44",
    courseName: "Getting started",
    userID: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601",
  },
});

export default courseCompleted;
