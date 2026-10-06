import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, seg } from "../lib/client.ts";
import { OBJECT_NUMBER_PARAM } from "../lib/params.ts";

interface Input {
  objectNumber: number;
}

/** `GET /metadata/records/{id}`. */
const objectGet: ActionDefinition<Input> = {
  key: "object-get",
  type: "read",
  resource: "object",
  title: "Get Object",
  description: "Read one object's metadata (name, system name, object number) by its number.",
  params: [OBJECT_NUMBER_PARAM],
  output: [{ key: "object", type: "object", label: "name, systemName, objectType" }],

  async execute(input, ctx) {
    const body = await new FireberryClient(ctx).request<{ data?: unknown }>(
      "GET",
      `/metadata/records/${seg(input.objectNumber)}`,
    );
    return { object: body.data ?? null };
  },
};

export default objectGet;
