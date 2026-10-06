import projectUpdate from "../../actions/project-update.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(projectUpdate, {
  name: "project-update",
  method: "PATCH",
  path: "/Projects",
  input: { id: 6, status: 5 },
  body: { id: 6, status: 5 },
  required: ["id"],
});
