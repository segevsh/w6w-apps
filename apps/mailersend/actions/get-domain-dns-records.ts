import { getById, seg } from "../lib/factories.ts";

export default getById({
  key: "get-domain-dns-records",
  resource: "domain",
  title: "Get Domain DNS Records",
  description:
    "Read the DNS records a domain needs (GET /v1/domains/{id}/dns-records): `spf`, `dkim_ms1` and `dkim_ms2` (DKIM is two CNAMEs now), `return_path`, `custom_tracking` and `inbound_routing`, each with `hostname`, `type` and `value`.",
  path: (id) => `/domains/${seg(id)}/dns-records`,
  idKey: "domainId",
  idLabel: "Domain ID",
});
