import { snapshotTrigger } from "../lib/snapshot.ts";
import envList from "../actions/env-list.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * Same bounded list as `new-env-var`; a variable's `updatedAt` is part of its snapshot row, so a
 * changed value or target is a new event too (values stay encrypted: `decrypt` is never set;
 * https://vercel.com/docs/rest-api/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name,
 * 2026-11-10).
 */
export default snapshotTrigger({
  key: "new-or-updated-env-var",
  title: "New or Updated Environment Variable",
  description: "The run gets each environment variable that is added or changed in the project.",
  action: envList as never,
  params: [PROJECT_PARAM],
  input: (p) => ({ projectId: p.projectId }),
  items: (r) => Array.isArray(r) ? r : (r as { envs?: unknown[] } | undefined)?.envs ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  stampOf: (i) => (i as { updatedAt?: unknown }).updatedAt,
  output: [
    { key: "id", type: "string", label: "Variable ID" },
    { key: "key", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "target", type: "array", label: "Targets" },
    { key: "createdAt", type: "number", label: "Created (ms)" },
    { key: "updatedAt", type: "number", label: "Updated (ms)" },
  ],
  sample: {
    id: "env_4Lq8mXv2TnRz7Wc1",
    key: "DATABASE_URL",
    type: "encrypted",
    target: ["production", "preview"],
    createdAt: 1794700800000,
    updatedAt: 1794787200000,
  },
});
