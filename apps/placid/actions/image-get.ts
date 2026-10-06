import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, required } from "../lib/client.ts";
import { renderOutput } from "../lib/params.ts";

interface Input {
  id: string | number;
}

/** `GET /images/{id}` — the render record; `image_url` is null until `status` is `finished`. */
const action: ActionDefinition<Input, unknown> = {
  key: "image-get",
  type: "read",
  resource: "image",
  title: "Get Image",
  description: "Retrieve a image render by id to check its status and get the finished file URL.",
  params: [
    { key: "id", label: "Image ID", type: "string", required: true },
  ],
  output: [
    ...renderOutput("image_url"),
  ],

  async execute(input, ctx) {
    const id = required(input.id, "id");
    return await new PlacidClient(ctx).json(`/images/${encodeURIComponent(id)}`);
  },
};

export default action;
