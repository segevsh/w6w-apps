import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "course-get",
  resource: "course",
  title: "Get Course",
  description: "Fetch one course by its numeric id.",
  path: "/courses",
  idLabel: "Course ID",
  outputLabel: "Course",
});
