import projectTaskUpdate from "../../actions/project-task-update.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(projectTaskUpdate, {
  name: "project-task-update",
  method: "PATCH",
  path: "/Projects/6/Tasks",
  input: { id: 11, projectID: 6, status: 5 },
  body: { id: 11, projectID: 6, status: 5 },
  required: ["id", "projectID"],
});
