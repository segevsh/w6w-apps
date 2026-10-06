import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId } from "../lib/params.ts";

interface Input {
  portalId: string;
}

const portalGet: ActionDefinition<Input> = {
  key: "portal-get",
  type: "read",
  resource: "portal",
  title: "Get Portal",
  description: "Fetch one portal's details (plan, owner, timezone).",
  params: [
    portalId,
  ],
  output: [{ key: "item", type: "object", label: "Record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).get(`/portal/${enc(input.portalId)}`);
    return { item: body };
  },
};

export default portalGet;
