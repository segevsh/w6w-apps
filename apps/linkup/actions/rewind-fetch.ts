import type { ActionDefinition } from "@w6w/types";
import { LinkupClient } from "../lib/client.ts";
import { required } from "../lib/params.ts";

interface Input {
  url: string;
  asOf: string;
}

const rewindFetch: ActionDefinition<Input, Record<string, unknown>> = {
  key: "rewind-fetch",
  type: "read",
  resource: "rewind",
  title: "Fetch a Page as of a Past Day (Beta)",
  description:
    "Return a page as it was by the end of a given UTC day. The URL must match the stored URL " +
    "exactly: Linkup applies no normalisation (404 if it is not stored).",
  params: [
    { key: "url", label: "URL", type: "string", required: true },
    {
      key: "asOf",
      label: "As of (UTC day)",
      type: "string",
      required: true,
      placeholder: "2025-06-30",
      hint: "YYYY-MM-DD.",
    },
  ],
  output: [
    { key: "asOf", type: "string", label: "The UTC day fetched" },
    { key: "url", type: "string", label: "Page URL" },
    { key: "name", type: "string", label: "Page title" },
    { key: "content", type: "string", label: "Full text of the revision" },
    { key: "validFrom", type: "string", label: "First day this revision is visible" },
    {
      key: "validTo",
      type: "string",
      label: "First day it is no longer visible (null if current)",
    },
  ],

  async execute(input, ctx) {
    const asOf = required(input.asOf, "As of");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("As of must be YYYY-MM-DD");
    const body = await new LinkupClient(ctx).post<Record<string, unknown>>(
      "/v1/rewind/fetch",
      { url: required(input.url, "URL"), asOf },
    );
    return {
      asOf: body?.asOf ?? asOf,
      url: body?.url,
      name: body?.name,
      content: body?.content,
      validFrom: body?.validFrom,
      validTo: body?.validTo ?? null,
    };
  },
};

export default rewindFetch;
