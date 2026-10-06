import projectCreate from "../../actions/project-create.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(projectCreate, {
  name: "project-create",
  method: "POST",
  path: "/Projects",
  input: {
    companyID: 4,
    projectName: "Migrate",
    projectType: 1,
    startDateTime: "2026-10-01T00:00:00Z",
    endDateTime: "2026-11-01T00:00:00Z",
  },
  body: {
    companyID: 4,
    projectName: "Migrate",
    projectType: 1,
    startDateTime: "2026-10-01T00:00:00Z",
    endDateTime: "2026-11-01T00:00:00Z",
  },
  required: ["companyID", "projectName", "projectType", "startDateTime", "endDateTime"],
});
