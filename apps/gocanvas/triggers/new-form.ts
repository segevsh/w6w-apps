import { snapshotTrigger } from "../lib/triggers.ts";
import formList from "../actions/form-list.ts";

interface Form {
  id?: number | string;
}

/**
 * Forms are read whole (`GET /forms`, pages of 100, no sort or created filter documented), so each
 * check diffs the ids against the previous check.
 */
const newForm = snapshotTrigger({
  key: "new-form",
  title: "New Form",
  description:
    "The run gets each form that appears in the list of forms the user can access (Get Many Forms).",
  action: formList,
  paged: true,
  idOf: (f) => String((f as Form).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Form ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "version", type: "number", label: "Version" },
    { key: "root_version_id", type: "number", label: "Root version ID" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 346127,
    type: "form",
    name: "Web Form",
    description: "User Info",
    status: "published",
    version: 1,
    root_version_id: 346127,
    updated_at: "2023-02-15T14:30:00Z",
  },
});

export default newForm;
