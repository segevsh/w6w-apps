import localeList from "../actions/locale-list.ts";
import { projectIdParam, snapshotTrigger } from "../lib/depth.ts";

// GET /projects/{project_id}/locales sorts only by name or default flag
// (https://developers.phrase.com/en/api/strings/locales/list-locales, verified 2026-11-10); a project
// has tens of locales, so each check reads the list and diffs the ids.
export default snapshotTrigger<{ projectId: string }>({
  key: "new-locale",
  title: "New Locale",
  description: "The run gets each locale newly added to the chosen project.",
  action: localeList as never,
  params: [projectIdParam],
  input: (p) => ({ projectId: p.projectId }),
  output: [
    { key: "id", type: "string", label: "Locale ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "code", type: "string", label: "Code" },
    { key: "default", type: "boolean", label: "Default locale" },
  ],
  sample: { id: "locale-sample-2", name: "German", code: "de", default: false },
});
