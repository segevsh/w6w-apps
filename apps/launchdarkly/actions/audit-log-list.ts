import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /auditlog` — verified against LaunchDarkly's OpenAPI document
 * (`getAuditLogEntries`).
 *
 * **The audit log is the only record of who changed a flag and why**, and it is
 * account-wide rather than per project — so this is where an incident review
 * starts.
 *
 * `before` and `after` are **epoch milliseconds**, not ISO timestamps, which is
 * the parameter most likely to be got wrong: an ISO string is not rejected, it
 * simply does not filter.
 *
 * The `spec` parameter takes LaunchDarkly's resource specifier syntax
 * (`proj/default:env/production:flag/my-flag`), which is how you narrow to one
 * flag's history rather than reading the whole account's.
 */
const action: ActionDefinition = {
  key: "audit-log-list",
  type: "read",
  resource: "audit-log",
  title: "List audit log entries",
  description: "Who changed what, account-wide. The only record of why a flag moved.",
  params: [
    {
      key: "spec",
      label: "Resource Specifier",
      type: "string",
      default: "",
      placeholder: "proj/default:env/production:flag/new-checkout",
      hint: "LaunchDarkly's resource syntax. Narrows to one flag, environment or project.",
    },
    {
      key: "q",
      label: "Search",
      type: "string",
      default: "",
      hint: "Matches the entry's title and description.",
    },
    {
      key: "after",
      label: "After",
      type: "string",
      default: "",
      hint: "Epoch MILLISECONDS, not an ISO timestamp — an ISO string does not filter.",
    },
    {
      key: "before",
      label: "Before",
      type: "string",
      default: "",
      hint: "Epoch milliseconds.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    for (const key of ["after", "before"] as const) {
      const raw = String(p[key] ?? "").trim();
      if (raw && !/^\d+$/.test(raw)) {
        throw new Error(
          `\`${key}\` must be epoch milliseconds — an ISO timestamp is accepted but does not filter`,
        );
      }
    }

    ctx.log("info", "listing LaunchDarkly audit log entries", { returnAll, limit });

    return await new LaunchDarklyClient(ctx).requestAll("/auditlog", {
      query: {
        spec: (p.spec as string) || undefined,
        q: (p.q as string) || undefined,
        after: (p.after as string) || undefined,
        before: (p.before as string) || undefined,
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
