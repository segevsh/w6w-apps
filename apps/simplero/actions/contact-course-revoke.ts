import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  courseId: number;
}

export default contactAction<Input>({
  key: "contact-course-revoke",
  title: "Revoke Course Access",
  description: "Revoke a contact's access to a course.",
  action: "course_revoke",
  idempotent: false,
  params: [contactIdParam, refParam("courseId", "Course ID", "The course to revoke.")],
  body: (i) => ({ course_id: i.courseId }),
});
