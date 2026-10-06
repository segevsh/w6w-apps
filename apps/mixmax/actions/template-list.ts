import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, resultsOf } from "../lib/client.ts";

interface Input {
  search?: string;
  sharedDirectOnly?: boolean;
  isInline?: boolean;
  sort?: string;
  sortAscending?: boolean;
}

const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "read",
  resource: "template",
  title: "List Templates",
  description:
    "List templates and snippets you can access (including those shared with you). Mixmax calls these snippets.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Search string." },
    {
      key: "sharedDirectOnly",
      label: "Shared only",
      type: "boolean",
      hint: "Only items shared with you.",
    },
    {
      key: "isInline",
      label: "Snippets only",
      type: "boolean",
      hint: "`true` for snippets only, `false` for templates only.",
    },
    { key: "sort", label: "Sort field", type: "string", hint: "Field to sort by." },
    { key: "sortAscending", label: "Sort ascending", type: "boolean", hint: "Sort ascending." },
  ],
  output: [{ key: "results", type: "array", label: "Templates" }],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request("GET", "/snippets", {
      query: {
        search: input.search,
        sharedDirectOnly: input.sharedDirectOnly,
        isInline: input.isInline,
        sort: input.sort,
        sortAscending: input.sortAscending,
      },
    });
    return { results: resultsOf(r) };
  },
};

export default templateList;
