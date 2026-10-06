import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, toPage } from "../lib/client.ts";
import { cursorParam, pageOutput } from "../lib/params.ts";

interface Input {
  include_legacy?: boolean;
  cursor?: string;
}

/** `GET /fonts` — 20 per page, cursor-paginated. */
const action: ActionDefinition<Input, ReturnType<typeof toPage>> = {
  key: "font-list",
  type: "search",
  resource: "font",
  title: "List Fonts",
  description:
    "List the project's custom fonts. Each `uuid` is the font code to use as `font` on a text layer.",
  params: [
    {
      key: "include_legacy",
      label: "Include legacy fonts",
      type: "boolean",
      hint: "Also list legacy account-wide fonts uploaded before per-project fonts existed.",
    },
    cursorParam,
  ],
  output: [
    ...pageOutput,
  ],

  async execute(input, ctx) {
    const body = await new PlacidClient(ctx).json("/fonts", {
      query: { include_legacy: input.include_legacy ? 1 : undefined, cursor: input.cursor },
    });
    return toPage(body);
  },
};

export default action;
