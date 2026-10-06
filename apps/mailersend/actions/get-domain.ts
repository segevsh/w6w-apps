import { getById, seg } from "../lib/factories.ts";

export default getById({
  key: "get-domain",
  resource: "domain",
  title: "Get Domain",
  description:
    "Read one sending domain, including its settings and verification flags (GET /v1/domains/{id}).",
  path: (id) => `/domains/${seg(id)}`,
  idKey: "domainId",
  idLabel: "Domain ID",
  idHint: "The `id` from List Domains (a short hash such as `yjm4ej`).",
});
