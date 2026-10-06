import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  siteId: number;
  sendLoginEmail?: boolean;
}

export default contactAction<Input>({
  key: "contact-site-grant",
  title: "Grant Site Access",
  description: "Give a contact access to a member site, optionally emailing them a login link.",
  action: "site_grant",
  idempotent: false,
  params: [
    contactIdParam,
    refParam("siteId", "Site ID", "The site to grant, e.g. from List Sites."),
    { key: "sendLoginEmail", label: "Send login email", type: "boolean" },
  ],
  body: (i) => ({ site_id: i.siteId, send_login_email: i.sendLoginEmail }),
});
