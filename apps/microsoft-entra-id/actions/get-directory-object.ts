import type { ActionDefinition } from "@w6w/types";
import { GraphClient, seg } from "../lib/client.ts";
import { objectIdParam } from "../lib/params.ts";

interface Input {
  objectId: string;
}

/**
 * `GET /directoryObjects/{id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/directoryobject-get?view=graph-rest-1.0
 *
 * Resolves any directory object id — user, group, application, service principal, device, role —
 * without knowing its type in advance; the answer's `@odata.type` says which it is. That is
 * exactly what the member, owner and role-member lists return, so this is the way to look at one
 * entry. Takes no query parameters, and returns the default property set of the resolved type.
 * Needs `Directory.Read.All`.
 */
const getDirectoryObject: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-directory-object",
  type: "read",
  resource: "directory-object",
  title: "Get Directory Object",
  description: "Resolve any directory object by id, whatever its type.",
  params: [
    objectIdParam("objectId", "Object id", "The id of a user, group, device, application, …"),
  ],
  output: [
    { key: "@odata.type", type: "string", label: "Object type" },
    { key: "id", type: "string", label: "Object id" },
    { key: "displayName", type: "string", label: "Display name" },
  ],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(`/directoryObjects/${seg(input.objectId)}`);
  },
};

export default getDirectoryObject;
