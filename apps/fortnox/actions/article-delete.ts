import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  articleNumber: string;
}

const articleDelete: ActionDefinition<Input> = {
  key: "article-delete",
  type: "perform",
  resource: "article",
  title: "Delete Article",
  description: "Delete an article by article number.",
  idempotent: true,
  params: [
    {
      "key": "articleNumber",
      "label": "Article number",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "deleted",
      "type": "boolean",
      "label": "True when Fortnox answered 204",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).delete(`/3/articles/${seg(input.articleNumber)}`);
  },
};

export default articleDelete;
