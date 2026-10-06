import { getAction } from "../lib/factory.ts";

/** `GET /v4/templates/{name}` */
export default getAction({
  key: "template-get",
  title: "Get Template",
  description: "Load one template by name, including its body parts and subject.",
  resource: "template",
  path: "/templates/{id}",
  idKey: "name",
  idLabel: "Template name",
  outputKey: "Name",
});
