import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient } from "../lib/client.ts";
import {
  buildQuery,
  type QueryInput,
  queryParams,
  requestOverridesParam,
  withOverrides,
} from "../lib/params.ts";

interface Input extends QueryInput {
  url: string;
  content?: boolean;
  cookies?: boolean;
  screenshot?: boolean;
  browserWSEndpoint?: boolean;
  ttl?: number;
  requestOverrides?: Record<string, unknown> | string;
}

const unblock: ActionDefinition<Input> = {
  key: "unblock",
  type: "read",
  resource: "page",
  title: "Unblock Page",
  description:
    "Load a bot-protected page with Browserless's stealth browser and return its content, " +
    "cookies and/or a screenshot. Pair with a residential proxy for hard targets.",
  params: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
    },
    { key: "content", label: "Return HTML", type: "boolean", default: true },
    { key: "cookies", label: "Return cookies", type: "boolean" },
    { key: "screenshot", label: "Return screenshot (base64)", type: "boolean" },
    {
      key: "browserWSEndpoint",
      label: "Return browser WebSocket endpoint",
      type: "boolean",
      hint: "Keeps the browser alive for the TTL so you can connect over WebSocket yourself.",
    },
    {
      key: "ttl",
      label: "Browser keep-alive (ms)",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "How long the browser stays open when the WebSocket endpoint is requested.",
    },
    ...queryParams,
    requestOverridesParam,
  ],
  output: [
    { key: "content", type: "string", label: "Page HTML" },
    { key: "cookies", type: "array", label: "Cookies" },
    { key: "screenshot", type: "string", label: "Screenshot, base64" },
    { key: "browserWSEndpoint", type: "string", label: "WebSocket endpoint" },
  ],

  async execute(input, ctx) {
    if (!input.url?.trim()) throw new Error("URL is required");
    const flags = {
      content: input.content === undefined ? true : input.content,
      cookies: input.cookies ? true : undefined,
      screenshot: input.screenshot ? true : undefined,
      browserWSEndpoint: input.browserWSEndpoint ? true : undefined,
      ttl: input.ttl,
    };
    const body = withOverrides({
      url: input.url.trim(),
      ...Object.fromEntries(Object.entries(flags).filter(([, v]) => v !== undefined)),
    }, input.requestOverrides);
    return await new BrowserlessClient(ctx).json("/unblock", {
      method: "POST",
      query: buildQuery(input),
      body,
    });
  },
};

export default unblock;
