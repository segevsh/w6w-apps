import type { ActionDefinition } from "@w6w/types";
import { camelKeys, qs, ses } from "../lib/api.ts";

/**
 * ListEmailIdentities — `GET /v2/email/identities?NextToken=&PageSize=`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_ListEmailIdentities.html
 *
 * (The service model also lists a POST `/v2/email/list-identities` variant for filtered queries; the
 * documented GET is what this action calls.)
 */
interface Input {
  pageSize?: number;
  nextToken?: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "identity-list",
  type: "search",
  resource: "identity",
  title: "List Identities",
  description:
    "List the email addresses and domains registered as sending identities in this region.",
  params: [
    { key: "pageSize", label: "Page size", type: "number", hint: "Max items per page (1-1000)." },
    {
      key: "nextToken",
      label: "Next token",
      type: "string",
      hint: "Token from a previous call to fetch the next page.",
    },
  ],
  output: [
    {
      key: "identities",
      type: "array",
      label: "Identities: identityType, identityName, sendingEnabled, verificationStatus",
    },
    { key: "nextToken", type: "string", label: "Token for the next page, absent on the last page" },
  ],

  async execute(input, ctx) {
    const res = await ses<{ EmailIdentities?: unknown[]; NextToken?: string }>(ctx, {
      op: "ListEmailIdentities",
      path: "/v2/email/identities",
      query: qs({ PageSize: input.pageSize, NextToken: input.nextToken }),
    });
    return { identities: camelKeys(res.EmailIdentities ?? []), nextToken: res.NextToken };
  },
};

export default action;
