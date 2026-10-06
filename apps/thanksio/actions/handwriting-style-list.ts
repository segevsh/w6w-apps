import type { ActionDefinition } from "@w6w/types";
import { ThanksioClient } from "../lib/client.ts";

/** `GET /api/v2/handwriting-styles` — `{data: [{handwriting_style_id, name, type, sample, …}]}` */
type Input = Record<string, never>;

const handwritingStyleList: ActionDefinition<Input> = {
  key: "handwriting-style-list",
  type: "read",
  resource: "handwriting-style",
  title: "List Handwriting Styles",
  description: "List the handwriting styles available for a message. Use a " +
    "`handwriting_style_id` from here in the Send actions.",
  params: [],
  output: [{ key: "styles", type: "array", label: "Handwriting styles" }],

  async execute(_input, ctx) {
    const body = await new ThanksioClient(ctx).call<{ data?: unknown[] }>("/handwriting-styles");
    return { styles: body.data ?? [] };
  },
};

export default handwritingStyleList;
