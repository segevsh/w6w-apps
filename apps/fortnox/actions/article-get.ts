import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  articleNumber: string;
}

const articleGet: ActionDefinition<Input> = {
  key: "article-get",
  type: "read",
  resource: "article",
  title: "Get Article",
  description: "Fetch one article by article number.",
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
      "key": "Article",
      "type": "object",
      "label": "Article record",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(`/3/articles/${seg(input.articleNumber)}`);
  },
};

export default articleGet;
