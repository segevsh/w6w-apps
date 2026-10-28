import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId } from "../lib/params.ts";

interface Input {
  portalId: string;
  userId: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Portal User",
  description: "Fetch one portal user by ZPUID or email address.",
  params: [
    portalId,
    {
      key: "userId",
      label: "User (ZPUID or email)",
      type: "string",
      required: true,
      hint: "The ZPUID or the email address of the user.",
    },
  ],
  output: [{ key: "item", type: "object", label: "Record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).get(
      `/portal/${enc(input.portalId)}/users/${enc(input.userId)}`,
    );
    return { item: body };
  },
};

export default userGet;
