import { getById, seg } from "../lib/factories.ts";

export default getById({
  key: "get-template",
  resource: "template",
  title: "Get Template",
  description: "Read one template with its category, domain and stats (GET /v1/templates/{id}).",
  path: (id) => `/templates/${seg(id)}`,
  idKey: "templateId",
  idLabel: "Template ID",
});
