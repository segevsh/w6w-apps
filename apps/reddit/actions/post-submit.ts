import type { ActionDefinition } from "@w6w/types";
import { RedditClient } from "../lib/client.ts";

interface Input {
  subreddit: string;
  kind: "self" | "link";
  title: string;
  text?: string;
  url?: string;
  resubmit?: boolean;
  nsfw?: boolean;
  spoiler?: boolean;
}

interface Submitted {
  id: string;
  name: string;
  url: string;
}

/**
 * `POST /api/submit` (scope: submit) —
 * github.com/reddit-archive/reddit/wiki/API#POST_api_submit, ported from
 * n8n's `Reddit.node.ts` (`post: create`).
 *
 * Reddit's response for this endpoint (with `api_type=json`) is
 * `{ json: { data: { id, name, url }, errors: [] } }`; `RedditClient`
 * unwraps `errors` into a thrown error, so `execute` only ever sees `.json.data`.
 */
const postSubmit: ActionDefinition<Input, Submitted> = {
  key: "post-submit",
  type: "perform",
  resource: "post",
  title: "Submit Post",
  description: "Submit a text (self) or link post to a subreddit.",
  // A retry after a transient failure risks a duplicate post — Reddit's
  // `/api/submit` has no idempotency-key parameter.
  idempotent: false,
  params: [
    { key: "subreddit", label: "Subreddit", type: "string", required: true, placeholder: "test" },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      required: true,
      default: "self",
      options: [
        { value: "self", label: "Text post" },
        { value: "link", label: "Link post" },
      ],
    },
    { key: "title", label: "Title", type: "string", required: true, hint: "Up to 300 characters." },
    {
      key: "text",
      label: "Text",
      type: "text",
      hint: 'Markdown supported. Required when Kind is "Text post".',
      showIf: { "==": [{ var: "kind" }, "self"] },
    },
    {
      key: "url",
      label: "URL",
      type: "string",
      hint: 'Required when Kind is "Link post".',
      showIf: { "==": [{ var: "kind" }, "link"] },
    },
    {
      key: "resubmit",
      label: "Resubmit",
      type: "boolean",
      default: false,
      hint: "Post the URL even if it was already posted to this subreddit before.",
      showIf: { "==": [{ var: "kind" }, "link"] },
    },
    { key: "nsfw", label: "Mark NSFW", type: "boolean", default: false, advanced: true },
    { key: "spoiler", label: "Mark spoiler", type: "boolean", default: false, advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Post ID" },
    { key: "name", type: "string", label: "Fullname (t3_...)" },
    { key: "url", type: "string", label: "Post URL" },
  ],

  async execute(input, ctx) {
    if (input.kind === "self" && !input.text) {
      throw new Error('post-submit needs `text` when kind is "self"');
    }
    if (input.kind === "link" && !input.url) {
      throw new Error('post-submit needs `url` when kind is "link"');
    }

    const res = await new RedditClient(ctx).request<{ json: { data: Submitted } }>(
      "/api/submit",
      {
        method: "POST",
        form: {
          api_type: "json",
          sr: input.subreddit,
          kind: input.kind,
          title: input.title,
          text: input.kind === "self" ? input.text : undefined,
          url: input.kind === "link" ? input.url : undefined,
          resubmit: input.kind === "link" ? input.resubmit ?? false : undefined,
          nsfw: input.nsfw ?? false,
          spoiler: input.spoiler ?? false,
        },
      },
    );
    return res.json.data;
  },
};

export default postSubmit;
