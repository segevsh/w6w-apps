import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, V2 } from "../lib/client.ts";
import { clientFolderOutput } from "../lib/params.ts";

interface Input {
  name: string;
  description?: string;
  userId?: string;
}

/**
 * `POST /api/v2/clients` — create a client folder.
 *
 * The Create-a-client-folder table in noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) marks `name` required;
 * `description` and `user_id` are optional, and `user_id` "returns an error in
 * case you are using the login user method to authenticate (USER token)".
 *
 * Not idempotent: the document exposes no uniqueness rule on the name, so a
 * retry can create a second folder with the same name.
 */
const clientFolderCreate: ActionDefinition<Input> = {
  key: "client-folder-create",
  type: "perform",
  resource: "client-folder",
  title: "Create Client Folder",
  description:
    "Create a client folder, optionally with a description and an owner (POST /api/v2/clients).",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "The name of the client folder.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      config: { multiline: true },
      hint: "The client folder's description.",
    },
    {
      key: "userId",
      label: "Assign to",
      type: "string",
      hint: "User id or email to assign the folder to. API-key connections only — the document " +
        "states this parameter errors under USER-token authentication.",
    },
  ],
  output: clientFolderOutput,

  execute(input, ctx) {
    return new NocrmClient(ctx).request(`${V2}/clients`, {
      method: "POST",
      body: { name: input.name, description: input.description, user_id: input.userId },
    });
  },
};

export default clientFolderCreate;
