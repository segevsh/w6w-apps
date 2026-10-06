import projectTaskCreate from "../../actions/project-task-create.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(projectTaskCreate, {
  name: "project-task-create",
  method: "POST",
  path: "/Projects/6/Tasks",
  input: { projectID: 6, title: "Cutover", status: 1, taskType: 1 },
  body: { projectID: 6, title: "Cutover", status: 1, taskType: 1 },
  required: ["projectID", "title", "status", "taskType"],
});
