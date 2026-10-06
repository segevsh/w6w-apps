import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

type Input = Record<string, never>;

/** `POST /api/1/getTemplates/` */
const templatesList: ActionDefinition<Input> = {
  key: "templates-list",
  type: "read",
  title: "List Templates",
  description: "Templates with their ID, name and availability (limit: 1 request per second).",
  params: [],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(_input, ctx) {
    const result = await call(ctx, "getTemplates", {});
    return { result };
  },
};

export default templatesList;
