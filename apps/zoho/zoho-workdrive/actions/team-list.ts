import type { ActionDefinition } from "@w6w/types";
import { listResult, WorkDriveClient } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

interface Input {
  zuid?: string;
}

/** `GET /users/{zuid}/teams`. Without a ZUID the caller's own is read from `/users/me` first. */
const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List Teams",
  description: "List the WorkDrive teams a user belongs to (defaults to the connected user).",
  params: [{
    key: "zuid",
    label: "User ZUID",
    type: "string",
    hint: "Leave empty to use the connected user.",
  }],
  output: [...listOutput],

  async execute(input, ctx) {
    const client = new WorkDriveClient(ctx);
    let zuid = input.zuid;
    if (!zuid) {
      const me = await client.get("/users/me");
      zuid = (me.data as { id?: string } | undefined)?.id;
      if (!zuid) throw new Error("Zoho WorkDrive /users/me answered without a user id");
    }
    return listResult(await client.get(`/users/${encodeURIComponent(zuid)}/teams`));
  },
};

export default teamList;
