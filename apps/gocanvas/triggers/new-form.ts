import { snapshotTrigger } from "../lib/triggers.ts";
import formList from "../actions/form-list.ts";

interface Form {
  id?: number | string;
  root_version_id?: number | string | null;
}

/**
 * A form's identity is `root_version_id` ("The original Form identifier for all versions of the
 * Form"); `id` is only "this exact version", and republishing a form creates a new version with a
 * new `id`. Keying on `id` would announce every republish as a New Form. Falls back to `id` when
 * a record carries no root.
 */
const formKey = (f: Form): string => String(f.root_version_id ?? f.id ?? "");

/**
 * Forms are read whole (`GET /forms`, pages of 100, no sort or created filter documented), so each
 * check diffs the form identities (`root_version_id`, see `formKey`) against the previous check.
 */
const newForm = snapshotTrigger({
  key: "new-form",
  title: "New Form",
  description:
    "The run gets each form that appears in the list of forms the user can access (Get Many Forms). A new version of a form already seen is not a new form.",
  action: formList,
  paged: true,
  idOf: (f) => formKey(f as Form),
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
