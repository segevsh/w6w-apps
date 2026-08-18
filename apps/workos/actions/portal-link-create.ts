import type { ActionDefinition } from "@w6w/types";
import { compact, WorkOSClient } from "../lib/client.ts";

/**
 * `POST /portal/generate_link` — a page where the *customer's* IT administrator
 * sets up their own SSO or SCIM.
 *
 * This is the action that carries most of WorkOS's value, and the one worth
 * building a workflow around. Configuring SSO against a customer's identity
 * provider is a fiddly, per-customer, per-IdP job that normally means a shared
 * screen and an engineer. The Admin Portal hands that to the person who
 * actually administers Okta or Entra, in a page WorkOS hosts and validates.
 *
 * So the onboarding flow becomes: create the organization, mint a portal link,
 * email it to the customer's IT contact, and wait for the `dsync.activated` or
 * `connection.activated` event.
 *
 * ## The link is a bearer credential with a short life
 *
 * Anyone holding the URL can configure that organization's authentication. It
 * expires in five minutes by default — deliberately short, because it is meant
 * to be clicked immediately, not stored. A workflow that mints one and sits on
 * it will hand somebody a dead link; one that logs it has published a
 * configuration door.
 *
 * This action logs the organization and the intent, never the link.
 *
 * `intent` decides which setup the page offers, and they are separate pages:
 * `sso` for the login connection, `dsync` for user provisioning, plus
 * `audit_logs`, `log_streams`, `domain_verification` and `certificate_renewal`.
 */
const action: ActionDefinition = {
  key: "portal-link-create",
  type: "perform",
  resource: "portal",
  title: "Create an Admin Portal link",
  description:
    "Mint a hosted page where a customer's own IT admin configures their SSO or SCIM — which is " +
    "how the setup happens without an engineer on a call. The link is a short-lived credential.",
  idempotent: false,
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      default: "",
      hint: "Which customer this portal configures.",
    },
    {
      key: "intent",
      label: "Intent",
      type: "select",
      required: true,
      default: "sso",
      options: [
        { value: "sso", label: "SSO — connect their identity provider" },
        { value: "dsync", label: "Directory Sync — provision users over SCIM" },
        { value: "audit_logs", label: "Audit Logs — stream events to their SIEM" },
        { value: "log_streams", label: "Log Streams" },
        { value: "domain_verification", label: "Domain Verification" },
        { value: "certificate_renewal", label: "Certificate Renewal" },
      ],
      hint: "Each intent is a different page — SSO and Directory Sync are separate setups.",
    },
    {
      key: "returnUrl",
      label: "Return URL",
      type: "string",
      default: "",
      hint: "Where the administrator lands when they are finished — your own app, so the flow " +
        "does not dead-end on a WorkOS page.",
    },
    {
      key: "successUrl",
      label: "Success URL",
      type: "string",
      default: "",
      advanced: true,
      hint: "Where they land specifically on a successful setup.",
    },
  ],
  output: [
    { key: "link", type: "string", label: "Portal URL — a short-lived credential" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    if (!organizationId) throw new Error("`organizationId` is required");
    const intent = String(p.intent ?? "sso");

    // The organization and the intent are logged; the link never is.
    ctx.log("info", "minting a WorkOS Admin Portal link", { organizationId, intent });

    return await new WorkOSClient(ctx).request("/portal/generate_link", {
      method: "POST",
      body: compact({
        organization: organizationId,
        intent,
        return_url: p.returnUrl,
        success_url: p.successUrl,
      }),
    });
  },
};

export default action;
