import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  siteId: number;
}

export default contactAction<Input>({
  key: "contact-site-revoke",
  title: "Revoke Site Access",
  description: "Revoke a contact's access to a member site.",
  action: "site_revoke",
  idempotent: false,
  params: [
    contactIdParam,
    refParam("siteId", "Site ID", "The site to revoke access to, e.g. from List Sites."),
  ],
  body: (i) => ({ site_id: i.siteId }),
});
