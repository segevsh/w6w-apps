import { snapshotTrigger } from "../lib/snapshot.ts";
import projectList from "../actions/project-list.ts";

/**
 * Same bounded list as `new-project`; a project's `updatedAt` is part of its snapshot row, so an
 * edit (a new framework, a changed build command) is a new event too
 * (https://vercel.com/docs/rest-api/projects/retrieve-a-list-of-projects, 2026-11-10).
 */
export default snapshotTrigger({
  key: "new-or-updated-project",
  title: "New or Updated Project",
  description: "The run gets each project that is created or changed.",
  action: projectList as never,
  input: () => ({ returnAll: true }),
  items: (r) => Array.isArray(r) ? r : [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  stampOf: (i) => (i as { updatedAt?: unknown }).updatedAt,
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
    updatedAt: 1794787200000,
  },
});
