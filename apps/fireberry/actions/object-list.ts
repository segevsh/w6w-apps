import type { ActionDefinition } from "@w6w/types";
import { FireberryClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /metadata/records`. */
const objectList: ActionDefinition<Input> = {
  key: "object-list",
  type: "search",
  resource: "object",
  title: "Get Objects",
  description:
    "List every object in the CRM, built-in and custom, with its name, system name and object number.",
  params: [],
  output: [{ key: "objects", type: "array", label: "Objects: name, systemName, objectType" }],

  async execute(_input, ctx) {
    const body = await new FireberryClient(ctx).request<{ data?: unknown[] }>(
      "GET",
      "/metadata/records",
    );
    return { objects: body.data ?? [] };
  },
};

export default objectList;
