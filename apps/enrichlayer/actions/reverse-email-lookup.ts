import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  email: string;
  lookupDepth?: string;
  enrichProfile?: string;
}

/** `GET /profile/resolve/email` */
const reverseEmailLookup: ActionDefinition<Input> = {
  key: "reverse-email-lookup",
  type: "read",
  resource: "contact",
  title: "Reverse Email Lookup",
  description:
    "Resolve a person profile from a personal or work email address (3 credits; superficial depth is free on no match).",
  params: [
    { key: "email", label: "Email address", type: "string", required: true },
    {
      key: "lookupDepth",
      label: "Lookup depth",
      type: "select",
      hint:
        "deep (default) uses extra heuristics and charges even with no result; superficial only checks the database and charges nothing on no match.",
      options: [{ value: "deep", label: "deep" }, { value: "superficial", label: "superficial" }],
    },
    {
      key: "enrichProfile",
      label: "Enrich with cached profile",
      type: "select",
      hint: "enrich adds the cached profile for 1 extra credit.",
      options: [{ value: "skip", label: "skip" }, { value: "enrich", label: "enrich" }],
    },
  ],
  output: [
    { key: "profile", type: "object", label: "Cached profile when enrichment was requested" },
    { key: "result", type: "object", label: "The full response body" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/profile/resolve/email", {
      email: input.email,
      lookup_depth: input.lookupDepth,
      enrich_profile: input.enrichProfile,
    });
    return {
      profile: (res as { profile?: unknown }).profile ?? null,
      result: res,
    };
  },
};

export default reverseEmailLookup;
