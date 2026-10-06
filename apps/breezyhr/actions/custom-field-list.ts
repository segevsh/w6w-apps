import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company, seg } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  type: string;
}

/** `GET /company/{id}/custom-fields/{type}` — definitions, not values. */
const customFieldList: ActionDefinition<Input> = {
  key: "custom-field-list",
  type: "search",
  resource: "company",
  title: "List Custom Field Definitions",
  description:
    "List the company's custom field definitions for candidates or positions (name, data type, options).",
  params: [
    companyIdParam,
    {
      key: "type",
      label: "Applies to",
      type: "select",
      required: true,
      default: "candidate",
      options: [
        { value: "candidate", label: "Candidates" },
        { value: "position", label: "Positions" },
      ],
    },
  ],
  output: [{ key: "customFields", type: "array", label: "Custom field definitions" }],

  async execute(input, ctx) {
    return {
      customFields: await new BreezyClient(ctx).array(
        `${company(input.companyId)}/custom-fields/${seg(input.type)}`,
      ),
    };
  },
};

export default customFieldList;
