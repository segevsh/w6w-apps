import type { ActionDefinition } from "@w6w/types";
import { flag, IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/contacts/detail` — Fetch one contact by ID, optionally with its UTM parameters.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  contactId: number;
  includeUtms?: boolean;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get contact",
  description: "Fetch one contact by ID, optionally with its UTM parameters.",
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
    {
      key: "includeUtms",
      label: "Include UTMs",
      type: "boolean",
      hint: "Add a flat utms array, one row per call.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The contact" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/contacts/detail", {
      query: { contactId: input.contactId, includeUtms: flag(input.includeUtms) },
    });
  },
};

export default contactGet;
