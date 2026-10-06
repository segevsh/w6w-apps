import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, PdlClient } from "../lib/client.ts";
import { sandboxParam } from "../lib/params.ts";

interface Input {
  requests: unknown;
  required?: string;
  include_if_matched?: boolean;
  sandbox?: boolean;
}

/** `[{ params: {...}, metadata?: {...} }]`, 1-100 entries; a bare params object is wrapped. */
export function normalizeRequests(value: unknown, label = "requests"): unknown[] {
  const parsed = jsonValue(value, label);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${label} must be a non-empty JSON array.`);
  }
  if (parsed.length > 100) {
    throw new Error(`${label} holds at most 100 entries (got ${parsed.length}).`);
  }
  return parsed.map((entry, i) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${label}[${i}] must be an object.`);
    }
    const e = entry as Record<string, unknown>;
    return "params" in e ? e : { params: e };
  });
}

/** Count the 200-status entries of a bulk response. */
export function summarize(
  results: unknown,
): { results: unknown[]; count: number; matches: number } {
  const list = Array.isArray(results) ? results : [];
  const matches = list.filter((r) => (r as { status?: number })?.status === 200).length;
  return { results: list, count: list.length, matches };
}

const bulkEnrichPersons: ActionDefinition<Input> = {
  key: "bulk-enrich-persons",
  type: "read",
  resource: "person",
  title: "Bulk Enrich People",
  description:
    "Enrich up to 100 people in one call; the same as running Enrich Person for each. Results come back in request order, each with its own status (a 404 entry is a no-match, not a failure) and optional metadata you attached. Costs one credit per 200 entry.",
  params: [
    {
      key: "requests",
      label: "Requests",
      type: "json",
      required: true,
      hint:
        'JSON array of up to 100 entries: [{"params":{"email":"a@b.com"},"metadata":{"row":1}}]. A bare params object per entry also works. Params are the Enrich Person inputs.',
    },
    {
      key: "required",
      label: "Required fields (all requests)",
      type: "string",
      hint: "Boolean expression over top-level fields, applied to every request.",
    },
    {
      key: "include_if_matched",
      label: "Report matched inputs (all requests)",
      type: "boolean",
      default: false,
    },
    sandboxParam,
  ],
  output: [
    {
      key: "results",
      type: "array",
      label: "One {status, likelihood, data, metadata} per request",
    },
    { key: "count", type: "number", label: "Entries returned" },
    { key: "matches", type: "number", label: "Entries with status 200 (the credits spent)" },
  ],

  async execute(input, ctx) {
    const body = compact({
      requests: normalizeRequests(input.requests),
      required: input.required,
      include_if_matched: input.include_if_matched === true ? true : undefined,
    });
    const res = await new PdlClient(ctx).request<unknown>("POST", "/v5/person/bulk", {
      body,
      sandbox: input.sandbox === true,
    });
    return summarize(res);
  },
};

export default bulkEnrichPersons;
