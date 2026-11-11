import { snapshotTrigger } from "../lib/snapshot.ts";
import envList from "../actions/env-list.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /v10/projects/{idOrName}/env`
 * (https://vercel.com/docs/rest-api/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name,
 * 2026-11-10): one project's variables are a small bounded collection, so each check reads the whole
 * list (values stay encrypted: `decrypt` is never set) and diffs the variable ids.
 */
export default snapshotTrigger({
  key: "new-env-var",
  title: "New Environment Variable",
  description: "The run gets each environment variable newly added to the project.",
  action: envList as never,
  params: [PROJECT_PARAM],
  input: (p) => ({ projectId: p.projectId }),
  items: (r) => Array.isArray(r) ? r : (r as { envs?: unknown[] } | undefined)?.envs ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
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
    updatedAt: 1794700800000,
  },
});
