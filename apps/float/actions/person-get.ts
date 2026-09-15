import type { ActionDefinition } from "@w6w/types";
import { FloatClient, toCsv } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /v3/people/{people_id}` — retrieve a single person. */
interface Input {
  people_id: number;
  expand?: string[] | string;
}

const personGet: ActionDefinition<Input> = {
  key: "person-get",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: "Retrieve a single person by ID.",
  params: [
    idParam("people_id", "Person ID"),
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "account", label: "Account" },
        { value: "managers", label: "Managers" },
        { value: "contracts", label: "Contracts" },
      ],
    },
  ],
  output: [
    { key: "people_id", type: "number", label: "Person ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    return await new FloatClient(ctx).json(`/people/${input.people_id}`, {
      query: { expand: toCsv(input.expand) },
    });
  },
};

export default personGet;
