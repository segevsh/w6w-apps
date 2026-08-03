import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";
import { envelopeIdParam } from "../lib/params.ts";

interface Input {
  envelopeId: string;
  includeTabs?: boolean;
  includeExtended?: boolean;
  includeAnchorTabLocations?: boolean;
  includeMetadata?: boolean;
}

/**
 * `GET /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId}/recipients` —
 * `EnvelopeRecipients: list`. Docusign's own summary is "Gets the status of
 * recipients for an envelope", which is what makes this the action to use when
 * a workflow needs to know *who* has signed rather than merely whether the
 * envelope is complete.
 *
 * The response is a recipients object keyed by recipient type — `signers`,
 * `carbonCopies`, `certifiedDeliveries`, `agents`, `editors`,
 * `inPersonSigners`, `intermediaries`, `witnesses`, `notaries`, `seals`,
 * `participants` — each an array. There is no flat "recipients" array; the
 * output block below names the types most workflows read.
 *
 * `include_anchor_tab_locations` is only meaningful with `include_tabs`, which
 * is Docusign's rule and is stated in the hint rather than enforced here.
 */
const envelopeRecipientList: ActionDefinition<Input> = {
  key: "envelope-recipient-list",
  type: "read",
  resource: "recipient",
  title: "List Envelope Recipients",
  description: "List an envelope's recipients and each one's signing status.",
  params: [
    envelopeIdParam,
    {
      key: "includeTabs",
      label: "Include tabs",
      type: "boolean",
      hint: "Include each recipient's tabs (fields).",
    },
    {
      key: "includeExtended",
      label: "Include extended",
      type: "boolean",
      hint: "Include extended recipient properties.",
    },
    {
      key: "includeAnchorTabLocations",
      label: "Include anchor tab locations",
      type: "boolean",
      hint: "Return anchor-string tab positions. Only meaningful together with Include tabs.",
    },
    { key: "includeMetadata", label: "Include metadata", type: "boolean" },
  ],
  output: [
    { key: "signers", type: "array", label: "Signers" },
    { key: "carbonCopies", type: "array", label: "Carbon copies" },
    { key: "certifiedDeliveries", type: "array", label: "Certified deliveries" },
    { key: "agents", type: "array", label: "Agents" },
    { key: "editors", type: "array", label: "Editors" },
    { key: "recipientCount", type: "string", label: "Recipient count" },
    { key: "currentRoutingOrder", type: "string", label: "Current routing order" },
  ],

  execute(input, ctx) {
    return new DocusignClient(ctx).request(
      `/envelopes/${encodeURIComponent(input.envelopeId)}/recipients`,
      {
        query: {
          include_tabs: input.includeTabs,
          include_extended: input.includeExtended,
          include_anchor_tab_locations: input.includeAnchorTabLocations,
          include_metadata: input.includeMetadata,
        },
      },
    );
  },
};

export default envelopeRecipientList;
