import type { ActionDefinition } from "@w6w/types";
import { identifierList, KajabiClient } from "../lib/client.ts";
import { idListParam, relationshipOutput } from "../lib/params.ts";

/**
 * `POST /v1/contacts/{contact_id}/relationships/offers` — give someone access.
 *
 * ## The action most Kajabi workflows are actually built for
 *
 * Granting an offer is how a contact gets into a course, a membership or a
 * digital product without paying through Kajabi's checkout — the integration
 * point for an external payment, a bundle fulfilled elsewhere, a manual comp,
 * or a support remediation. It is the counterpart to `contact-offer-revoke`.
 *
 * ## `send_customer_welcome_email` lives in `meta`, and defaults to Kajabi's choice
 *
 * The spec puts this flag on the request document's `meta` object, beside
 * `data` rather than inside it — an unusual placement worth transcribing
 * exactly, since guessing it into `attributes` would make it silently inert.
 *
 * The param is left **unset** by default rather than defaulted either way. This
 * call causes real email to real people: forcing `false` would strip the
 * welcome mail (and its access instructions) from a customer who has just been
 * given a product, and forcing `true` would mail someone whose workflow was
 * mid-migration. Neither is this app's decision to make silently, so when the
 * box is untouched no `meta` is sent at all and Kajabi's own default applies.
 *
 * Idempotent: re-granting an offer the contact already holds converges.
 */
interface Input {
  contactId: string;
  offerIds: string;
  sendWelcomeEmail?: boolean;
}

const contactOfferGrant: ActionDefinition<Input> = {
  key: "contact-offer-grant",
  type: "perform",
  resource: "contact-offer",
  title: "Grant Offers to Contact",
  description:
    "Give a contact access to one or more offers — the way to fulfil a course, membership or " +
    "digital product bought outside Kajabi's checkout.",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "`contact-list` returns the ids.",
    },
    idListParam(
      "offerIds",
      "Offer IDs",
      "Comma-separated offer ids — sent as one request. `offer-list` returns the ids.",
    ),
    {
      key: "sendWelcomeEmail",
      label: "Send welcome email",
      type: "boolean",
      hint: "Sends Kajabi's customer welcome email, which carries the access instructions. " +
        "Leave unset to use Kajabi's own default — this app will not silently decide whether " +
        "a real person gets mailed.",
    },
  ],
  output: relationshipOutput,

  execute(input, ctx) {
    const data = identifierList(input.offerIds, "offers");
    if (!data) throw new Error("Offer IDs: supply at least one offer id");

    const body: Record<string, unknown> = { data };
    // Only send `meta` when the user actually expressed a preference — an
    // absent flag must mean "Kajabi decides", not "false".
    if (input.sendWelcomeEmail !== undefined) {
      body.meta = { send_customer_welcome_email: input.sendWelcomeEmail };
    }

    return new KajabiClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}/relationships/offers`,
      { method: "POST", body },
    );
  },
};

export default contactOfferGrant;
