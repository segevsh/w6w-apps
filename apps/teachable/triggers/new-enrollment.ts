import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import courseEnrollmentsList from "../actions/course-enrollments-list.ts";

interface Enrollment {
  user_id?: number;
  enrolled_at?: string;
}

// Teachable: GET /v1/courses/{course_id}/enrollments "are sorted by the 'enrolled_at' datetime" and
// `sort_direction=desc` returns the newest enrollment first
// (https://docs.teachable.com/reference/showcourseenrollments, verified 2026-11-10). Newest-first,
// brief 9.1 a; the course is the user's pick, so it is a required param.
export default pollFromListAction<{ courseId: number }>({
  key: "new-enrollment",
  title: "New Enrollment",
  description: "The run gets each student newly enrolled in the chosen course.",
  params: [{ key: "courseId", label: "Course ID", type: "number", required: true }],
  action: courseEnrollmentsList as unknown as ActionDefinition,
  input: (p) => ({ courseId: p.courseId, sortDirection: "desc" }),
  items: (result) => (result as { enrollments?: Enrollment[] }).enrollments ?? [],
  idOf: (item) => {
    const e = item as Enrollment;
    return `${e.user_id ?? ""}:${e.enrolled_at ?? ""}`;
  },
  output: [
    { key: "user_id", type: "number", label: "User ID" },
    { key: "enrolled_at", type: "string", label: "Enrolled at" },
    { key: "expires_at", type: "string", label: "Expires at" },
    { key: "completed_at", type: "string", label: "Completed at" },
    { key: "percent_complete", type: "number", label: "Percent complete" },
  ],
  sample: {
    user_id: 7,
    enrolled_at: "2026-11-09T00:00:00.000Z",
    expires_at: null,
    completed_at: null,
    percent_complete: 0,
  },
  maxPages: 1,
});
