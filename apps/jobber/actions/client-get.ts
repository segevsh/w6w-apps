import type { ActionDefinition } from "@w6w/types";
import { ADDRESS_FIELDS, CLIENT_FIELDS, JobberClient } from "../lib/client.ts";

interface Input {
  clientId: string;
}

/**
 * The properties connection is bounded at 10 rather than left open. An
 * unbounded connection is costed as if it returned Jobber's 100-node maximum,
 * which would price this single-record read at several hundred points.
 */
const QUERY = `
  query GetClient($id: EncodedId!) {
    client(id: $id) {
      ${CLIENT_FIELDS}
      clientProperties(first: 10) {
        nodes { id name address { id ${ADDRESS_FIELDS} } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const clientGet: ActionDefinition<Input> = {
  key: "client-get",
  type: "read",
  resource: "client",
  title: "Get Client",
  description:
    "Fetch one client by id, with their first 10 service properties. Returns `client: null` when the id does not belong to the connected account.",
  params: [
    {
      key: "clientId",
      label: "Client ID",
      type: "string",
      required: true,
      hint:
        "Jobber's EncodedId — a base64 string such as `Z2lkOi8vSm9iYmVyL0NsaWVudC8xMTkxOTUzNDA`, not a number.",
    },
  ],
  output: [{ key: "client", type: "object", label: "The client, or null" }],

  execute(input, ctx) {
    return new JobberClient(ctx).query(QUERY, { id: input.clientId });
  },
};

export default clientGet;
