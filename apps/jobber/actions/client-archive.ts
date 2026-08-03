import type { ActionDefinition } from "@w6w/types";
import { JobberClient, unwrap } from "../lib/client.ts";

interface Input {
  clientId: string;
}

const MUTATION = `
  mutation ArchiveClient($clientId: EncodedId!) {
    clientArchive(clientId: $clientId) {
      client { id name isArchived }
      userErrors { message path }
    }
  }
`;

/**
 * Archive, not delete. Jobber has a `clientDelete` mutation too; it is
 * deliberately not shipped. Archiving is reversible (`clientUnarchive`), keeps
 * the client's quotes, jobs and invoices intact, and is what the product's own
 * UI offers — which makes it the operation a workflow should be able to reach
 * without a confirmation dialog. Deleting a client from a workflow step is a
 * different risk class and is left to `graphql-query`, where it has to be
 * written out on purpose.
 *
 * Jobber refuses to archive a client with open work (`Client.isArchivable`
 * reports whether it will), and that refusal arrives as a `userErrors` entry at
 * HTTP 200.
 */
const clientArchive: ActionDefinition<Input> = {
  key: "client-archive",
  type: "perform",
  resource: "client",
  title: "Archive Client",
  description:
    "Archive a client. Reversible, and non-destructive — their history is retained. Jobber rejects the archive if the client still has open work.",
  idempotent: true,
  params: [{ key: "clientId", label: "Client ID", type: "string", required: true }],
  output: [{ key: "client", type: "object", label: "The archived client" }],

  async execute(input, ctx) {
    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      clientId: input.clientId,
    });
    return unwrap(data, "clientArchive");
  },
};

export default clientArchive;
