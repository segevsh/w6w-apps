import { deleteById, seg } from "../lib/factories.ts";

export default deleteById({
  key: "delete-template",
  resource: "template",
  title: "Delete Template",
  description:
    "Delete a template (DELETE /v1/templates/{id}). A scheduled email that uses it is not sent once the template is gone.",
  path: (id) => `/templates/${seg(id)}`,
  idKey: "templateId",
  idLabel: "Template ID",
});
