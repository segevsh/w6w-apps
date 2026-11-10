import { snapshotTrigger } from "../lib/snapshot.ts";
import projectList from "../actions/project-list.ts";

/**
 * `GET /v10/projects` documents no sort order (https://vercel.com/docs/rest-api/projects/retrieve-a-list-of-projects,
 * 2026-11-10), and a team's projects are a small bounded collection, so each check reads the whole
 * list (`returnAll`) and diffs the project ids against the previous one.
 */
export default snapshotTrigger({
  key: "new-project",
  title: "New Project",
  description: "The run gets each project that newly appears in the team or account.",
  action: projectList as never,
  input: () => ({ returnAll: true }),
  items: (r) => Array.isArray(r) ? r : [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "framework", type: "string", label: "Framework" },
    { key: "createdAt", type: "number", label: "Created (ms)" },
    { key: "updatedAt", type: "number", label: "Updated (ms)" },
  ],
  sample: {
    id: "prj_8Vq2nT5cJhXw1Zm4RkLs",
    name: "my-app",
    framework: "nextjs",
    createdAt: 1794700800000,
    updatedAt: 1794700800000,
  },
});
