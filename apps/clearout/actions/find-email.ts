import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient, ClearoutError, compact } from "../lib/client.ts";

interface Input {
  name: string;
  domain: string;
  timeout?: number;
  queue?: boolean;
}

/**
 * `POST /email_finder/instant`. With `queue: true` (the vendor's default) a search that
 * outlives `timeout` answers `524` with `error.additional_info.queue_id` and keeps running;
 * that is returned as `queued: true` + `queueId` (read it with `get-find-email-status`), not
 * thrown, because the work was accepted. Every other failure throws.
 */
const findEmail: ActionDefinition<Input> = {
  key: "find-email",
  type: "read",
  resource: "email",
  title: "Find Email",
  description: "Find a person's professional email address from their name and a company " +
    "domain or name. Returns candidate addresses with a confidence score. Costs a credit " +
    "when an address is found.",
  params: [
    { key: "name", label: "Name", type: "string", required: true, hint: "e.g. Tony Stark" },
    {
      key: "domain",
      label: "Domain or company",
      type: "string",
      required: true,
      hint: "e.g. marvel.com or Marvel Entertainment Company",
    },
    {
      key: "timeout",
      label: "Timeout (ms)",
      type: "number",
      validation: { min: 1000, max: 180000, integer: true },
      hint: "Vendor default 30000, maximum 180000.",
    },
    {
      key: "queue",
      label: "Keep searching in the background after a timeout",
      type: "boolean",
      default: true,
    },
  ],
  output: [
    {
      key: "queued",
      type: "boolean",
      label: "True when the search timed out and is still running",
    },
    { key: "queueId", type: "string", label: "Queue ID for Get Find Email Status" },
    { key: "emails", type: "array", label: "Candidates: email_address, role, business" },
    { key: "fullName", type: "string", label: "Full name" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "confidenceScore", type: "number", label: "Confidence score" },
    { key: "total", type: "number", label: "Number of candidates" },
    { key: "company", type: "object", label: "Company" },
  ],

  async execute(input, ctx) {
    const name = String(input.name ?? "").trim();
    const domain = String(input.domain ?? "").trim();
    if (!name || !domain) throw new Error("name and domain are required");
    try {
      const { data } = await new ClearoutClient(ctx).request("/email_finder/instant", {
        body: compact({ name, domain, timeout: input.timeout, queue: input.queue }),
      });
      return { queued: false, ...mapFound(data) };
    } catch (err) {
      const info = err instanceof ClearoutError && err.httpStatus === 524
        ? err.details?.additional_info
        : undefined;
      if (info?.queue_id) {
        ctx.log("info", "email search queued after timeout", { queueId: info.queue_id });
        return { queued: true, queueId: String(info.queue_id) };
      }
      throw err;
    }
  },
};

export function mapFound(data: unknown) {
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    emails: d.emails ?? [],
    firstName: d.first_name,
    lastName: d.last_name,
    fullName: d.full_name,
    domain: d.domain,
    confidenceScore: d.confidence_score,
    total: d.total,
    company: d.company,
    foundOn: d.found_on,
  };
}

export default findEmail;
