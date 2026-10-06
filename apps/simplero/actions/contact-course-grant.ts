import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  courseId: number;
}

export default contactAction<Input>({
  key: "contact-course-grant",
  title: "Grant Course Access",
  description: "Give a contact access to a course.",
  action: "course_grant",
  idempotent: false,
  params: [
    contactIdParam,
    refParam("courseId", "Course ID", "The course to grant, e.g. from List Courses."),
  ],
  body: (i) => ({ course_id: i.courseId }),
});
