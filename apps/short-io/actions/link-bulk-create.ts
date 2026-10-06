import type { ActionDefinition } from "@w6w/types";
import { compact, ShortClient, type ShortLink, stripPassword } from "../lib/client.ts";

interface Input {
  domain: string;
  links: Array<Record<string, unknown>>;
  allowDuplicates?: boolean;
  folderId?: string;
}

interface Result {
  results: Array<ShortLink | { error?: string; [k: string]: unknown }>;
  failed: number;
}

/**
 * POST /links/bulk — up to 1,000 links per call. Not transactional: "if any URL
 * is failed to insert, it returns error object instead as array element", so a
 * 200 can carry partial failure. `failed` counts the elements with no
 * `idString`; check it rather than the status. Vendor limit: 5 requests per 10 s.
 */
const linkBulkCreate: ActionDefinition<Input, Result> = {
  key: "link-bulk-create",
  type: "perform",
  resource: "link",
  title: "Create Links in Bulk",
  description: "Create up to 1,000 links on one domain in a single call.",
  idempotent: false,
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "go.example.com",
    },
    {
      key: "links",
      label: "Links",
      type: "json",
      required: true,
      hint: 'Array of link objects; each needs "originalURL" and may carry the same fields as ' +
        "Create Link (path, title, tags, …). Up to 1,000.",
    },
    { key: "allowDuplicates", label: "Allow duplicates", type: "boolean" },
    { key: "folderId", label: "Folder ID", type: "string" },
  ],
  output: [
    { key: "results", type: "array", label: "One entry per input link (link or error object)" },
    { key: "failed", type: "number", label: "Entries that failed" },
  ],

  async execute(input, ctx) {
    if (!Array.isArray(input.links) || input.links.length === 0) {
      throw new Error("links must be a non-empty array");
    }
    if (input.links.length > 1000) throw new Error("Short.io accepts at most 1000 links per call");
    const raw = await new ShortClient(ctx).request<Result["results"]>("/links/bulk", {
      method: "POST",
      body: compact({
        domain: input.domain,
        links: input.links,
        allowDuplicates: input.allowDuplicates,
        folderId: input.folderId,
      }),
    });
    const results = (Array.isArray(raw) ? raw : []).map((r) =>
      r && typeof r === "object" ? stripPassword(r as Record<string, unknown>) : r
    ) as Result["results"];
    const failed = results.filter((r) => !(r as { idString?: string })?.idString).length;
    return { results, failed };
  },
};

export default linkBulkCreate;
