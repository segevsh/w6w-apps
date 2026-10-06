import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  caseUid: string;
}

/** `GET /api/v1/support/cases/{caseUid}` — Retrieve one support case with its history. */
const getCase: ActionDefinition<Input> = {
  key: "get-case",
  type: "read",
  resource: "support",
  title: "Get Support Case",
  description: "Retrieve one support case with its history.",
  params: [
    {
      key: "caseUid",
      label: "Case Uid",
      type: "string",
      hint: "The case's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/support/cases/${pathId(input.caseUid)}`, {
      method: "GET",
    });
  },
};

export default getCase;
