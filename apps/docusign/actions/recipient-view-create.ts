import type { ActionDefinition } from "@w6w/types";
import { compact, DocusignClient, jsonObject } from "../lib/client.ts";
import { envelopeIdParam } from "../lib/params.ts";

interface Input {
  envelopeId: string;
  returnUrl: string;
  email: string;
  userName: string;
  clientUserId: string;
  recipientId?: string;
  authenticationMethod?: string;
  additionalFields?: unknown;
}

/**
 * `POST /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId}/views/recipient`
 * — `EnvelopeViews: createRecipient`. Mints the embedded-signing URL: the link
 * that drops a signer straight into Docusign's signing ceremony without an
 * email round-trip.
 *
 * Four things Docusign's reference states that a caller has to know, and which
 * are the reason this action exists as its own thing rather than a flag on
 * another:
 *
 *   1. **The envelope must be in `sent` status.** A draft has no recipient view.
 *   2. **`clientUserId` must match the value set on the recipient** when the
 *      envelope was created. That value is what makes a recipient *embedded*
 *      (captive); a recipient created without one is an ordinary email signer
 *      and this call fails for them. It is `required` here for exactly that
 *      reason — omitting it is never the right call, it just fails later.
 *   3. **The URL is single-use and expires after five minutes.** Docusign's own
 *      warning is "Do not store or email the returned URL". Treat the output as
 *      something to redirect to now, not a value to persist.
 *   4. **`authenticationMethod` is a record, not a control.** It tells Docusign
 *      how *your* application authenticated this person, and is written into the
 *      signature's audit trail. `none` is the honest value when a workflow has
 *      not authenticated anyone.
 *
 * Focus-view embedding additionally needs `frameAncestors` and `messageOrigins`;
 * those go through **Additional fields** rather than getting dedicated params,
 * because they are arrays whose correct values depend on the host page and the
 * environment (`https://apps-d.docusign.com` in demo,
 * `https://apps.docusign.com` in production).
 *
 * **Not idempotent.** Each call mints a fresh single-use URL and invalidates
 * nothing; a retry is a new URL, not the same one.
 */
const recipientViewCreate: ActionDefinition<Input> = {
  key: "recipient-view-create",
  type: "perform",
  resource: "recipient",
  title: "Create Recipient View (Embedded Signing URL)",
  description:
    "Mint a single-use, five-minute embedded signing URL for a captive recipient of a sent envelope.",
  idempotent: false,
  params: [
    envelopeIdParam,
    {
      key: "returnUrl",
      label: "Return URL",
      type: "string",
      required: true,
      hint:
        "Where Docusign sends the signer when the session ends. Include the scheme; max 470 characters. Docusign appends an `event` query parameter.",
    },
    {
      key: "email",
      label: "Recipient email",
      type: "string",
      required: true,
      hint: "Must match the recipient on the envelope.",
    },
    {
      key: "userName",
      label: "Recipient name",
      type: "string",
      required: true,
      hint: "Must match the recipient on the envelope.",
    },
    {
      key: "clientUserId",
      label: "Client user ID",
      type: "string",
      required: true,
      hint:
        "The same sender-supplied value set on the recipient when the envelope was created. It is what makes the recipient embedded; without a match, Docusign refuses the view.",
    },
    {
      key: "recipientId",
      label: "Recipient ID",
      type: "string",
      hint: "The recipient's id within the envelope, when several share an email address.",
    },
    {
      key: "authenticationMethod",
      label: "Authentication method",
      type: "select",
      default: "none",
      options: [
        { value: "none", label: "None" },
        { value: "email", label: "Email" },
        { value: "password", label: "Password" },
        { value: "singleSignOn_Other", label: "Single sign-on (other)" },
        { value: "biometric", label: "Biometric" },
        { value: "knowledgeBasedAuth", label: "Knowledge-based" },
        { value: "twoFactorAuth", label: "Two-factor" },
        { value: "smartCard", label: "Smart card" },
        { value: "digitalCertificate", label: "Digital certificate" },
      ],
      hint:
        "How your application authenticated this person. Recorded in the signature's audit trail — it does not perform any authentication.",
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint:
        "JSON object merged into the recipientViewRequest — frameAncestors, messageOrigins, pingUrl, pingFrequency, xFrameOptions, etc.",
    },
  ],
  output: [
    { key: "url", type: "string", label: "Single-use signing URL (expires in 5 minutes)" },
  ],

  execute(input, ctx) {
    const body = {
      ...jsonObject(input.additionalFields, "additionalFields"),
      ...compact({
        returnUrl: input.returnUrl,
        email: input.email,
        userName: input.userName,
        clientUserId: input.clientUserId,
        recipientId: input.recipientId,
        authenticationMethod: input.authenticationMethod ?? "none",
      }),
    };
    return new DocusignClient(ctx).request(
      `/envelopes/${encodeURIComponent(input.envelopeId)}/views/recipient`,
      { method: "POST", body },
    );
  },
};

export default recipientViewCreate;
