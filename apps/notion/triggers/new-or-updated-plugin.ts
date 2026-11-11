import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/list-plugins.ts";

export default snapshotTrigger<Record<string, never>>({
  key: "new-or-updated-plugin",
  title: "New or Updated Plugin",
  description:
    "The run gets each Agent Skills plugin newly available to the connection, and again whenever a plugin's contents change (its version id changes). Plugins come back in no guaranteed order and form a small list, so every check reads it all.",
  action,
  input: () => ({}),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  updated: true,
  output: [
    { key: "id", type: "string", label: "Plugin ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "version_id", type: "string", label: "Version ID" },
  ],
  sample: {
    "id": "plugin-triage",
    "name": "triage",
    "description": "Triage incoming requests",
    "version_id": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  },
});
