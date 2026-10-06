import type { ActionDefinition } from "@w6w/types";
import { call, listResult, pick } from "../lib/client.ts";
import { cursorParam, listOutput } from "../lib/params.ts";

/** `GET /contact-properties`. */
type Input = { cursor?: string };

const contactPropertyList: ActionDefinition<Input> = {
  key: "contact-property-list",
  type: "read",
  resource: "contact",
  title: "List Contact Properties",
  description:
    "List contact property definitions (name, label, type). The name is the key used when writing properties.",
  params: [cursorParam],
  output: listOutput("Property definitions [{name, label, type}]"),
  async execute(input, ctx) {
    const body = await call(ctx, "GET", "/contact-properties", {
      query: pick(input, ["cursor"]) as never,
    });
    return listResult(body, "properties");
  },
};

export default contactPropertyList;
