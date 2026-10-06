import { getById, seg } from "../lib/factories.ts";

export default getById({
  key: "verify-domain",
  resource: "domain",
  title: "Verify Domain",
  description:
    "Ask MailerSend to re-check a domain's DNS (GET /v1/domains/{id}/verify). Answers 200 either way: read `data` (`dkim`, `spf`, `mx`, `tracking`, `cname`, `rp_cname`) and `message`, not the status, to learn whether it passed.",
  path: (id) => `/domains/${seg(id)}/verify`,
  idKey: "domainId",
  idLabel: "Domain ID",
});
