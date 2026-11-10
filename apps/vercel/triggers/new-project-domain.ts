import { snapshotTrigger } from "../lib/snapshot.ts";
import projectDomainList from "../actions/project-domain-list.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /v9/projects/{idOrName}/domains`
 * (https://vercel.com/docs/rest-api/projects/retrieve-project-domains-by-project-by-id-or-name,
 * 2026-11-10): one project's domains are a small bounded collection, so each check reads the whole
 * list (`returnAll`) and diffs the domain names against the previous one.
 */
export default snapshotTrigger({
  key: "new-project-domain",
  title: "New Project Domain",
  description: "The run gets each domain newly added to the project.",
  action: projectDomainList as never,
  params: [PROJECT_PARAM],
  input: (p) => ({ projectId: p.projectId, returnAll: true }),
  items: (r) => Array.isArray(r) ? r : [],
  idOf: (i) => String((i as { name?: unknown }).name ?? ""),
  output: [
    { key: "name", type: "string", label: "Domain" },
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "verified", type: "boolean", label: "Verified" },
    { key: "gitBranch", type: "string", label: "Git branch" },
    { key: "createdAt", type: "number", label: "Created (ms)" },
  ],
  sample: {
    name: "app.example.com",
    projectId: "prj_8Vq2nT5cJhXw1Zm4RkLs",
    verified: true,
    gitBranch: null,
    createdAt: 1794700800000,
  },
});
