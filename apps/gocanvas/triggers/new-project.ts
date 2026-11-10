import { snapshotTrigger } from "../lib/triggers.ts";
import projectList from "../actions/project-list.ts";

interface Rec {
  id?: number | string;
}

/** Projects are read whole (`GET /projects`, pages of 100, no sort or created filter documented); ids are diffed between checks. */
const newProject = snapshotTrigger({
  key: "new-project",
  title: "New Project",
  description:
    "The run gets each project that appears in the project list (Get Many Projects; Project Management View only).",
  action: projectList,
  paged: true,
  idOf: (x) => String((x as Rec).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "department_id", type: "number", label: "Department ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "site_id", type: "number", label: "Site ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "code", type: "string", label: "Code" },
  ],
  sample: {
    id: 11,
    name: "My new Project",
    company_id: 135196,
    department_id: 21974,
    customer_id: 25,
    site_id: 6,
    start_date: "2023-10-01 00:00:00 UTC",
    end_date: null,
    status: "active",
    notes: "House renovation",
    code: "NEW00001",
  },
});

export default newProject;
