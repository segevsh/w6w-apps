import peopleSearch from "../actions/people-search.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `POST /people/search` returns every matching employee in one response (no pagination), so the roster is diffed. */
export default snapshotTrigger({
  key: "new-or-updated-employee",
  title: "New or Updated Employee",
  description:
    "The run gets each employee that is new in Bob or whose returned fields changed since the last check.",
  action: peopleSearch,
  input: () => ({}),
  items: (result) => (result as { employees?: unknown[] })?.employees ?? [],
  idOf: (item) => String((item as { id?: unknown })?.id ?? ""),
  updated: true,
  output: [
    { key: "id", type: "string", label: "Employee ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "displayName", type: "string", label: "Display name" },
  ],
  sample: { id: "3332741000", email: "ada@example.com", displayName: "Ada Lovelace" },
});
