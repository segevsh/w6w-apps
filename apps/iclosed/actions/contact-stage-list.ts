import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/fields/contact-stage` — Fetch the contact-stage field with its options.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
type Input = Record<string, never>;

const contactStageList: ActionDefinition<Input> = {
  key: "contact-stage-list",
  type: "read",
  resource: "field",
  title: "Get contact stages",
  description: "Fetch the contact-stage field with its options.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Field ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "identifier", type: "string", label: "Identifier" },
    { key: "CustomFieldOptions", type: "array", label: "Stage options" },
  ],

  execute(_input, ctx) {
    return new IClosedClient(ctx).json("/fields/contact-stage");
  },
};

export default contactStageList;
