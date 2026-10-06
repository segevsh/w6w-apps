import type { ActionDefinition } from "@w6w/types";
import { GoCanvasClient } from "../lib/client.ts";

type Input = Record<string, never>;

const meGet: ActionDefinition<Input> = {
  key: "me-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Profile of the authenticated user: id, name, login, company and default department. Use it to find the company id and default department id.",
  params: [],
  output: [
    { key: "data", type: "object", label: "The current user" },
  ],

  execute(_input, ctx) {
    return new GoCanvasClient(ctx).request("/me");
  },
};

export default meGet;
