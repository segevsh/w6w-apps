import type { ActionDefinition } from "@w6w/types";
import { OneSimpleApiClient } from "../lib/client.ts";

interface Input {
  url: string;
}

interface Output {
  url?: string;
  hops?: number;
  trace?: string[];
  elapsed?: number;
  [key: string]: unknown;
}

/**
 * GET /api/unshorten — resolve a shortened URL to its final destination.
 *
 * Output fields are inferred from the vendor's documented CSV columns
 * ("Expanded URL, Number of Hops, Trace") — see `take-screenshot.ts` for
 * why that inference is grounded rather than guessed.
 */
const expandUrl: ActionDefinition<Input, Output> = {
  key: "expand-url",
  type: "read",
  resource: "utility",
  title: "Expand URL",
  description: "Resolve a shortened link to its original, final URL.",
  params: [
    {
      key: "url",
      label: "Shortened URL",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "url", type: "string", label: "Expanded URL" },
    { key: "hops", type: "number", label: "Number of redirect hops" },
  ],

  execute(input, ctx) {
    const client = new OneSimpleApiClient(ctx);
    return client.request<Output>("/unshorten", { query: { url: input.url } });
  },
};

export default expandUrl;
