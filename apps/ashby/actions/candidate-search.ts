import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";

/**
 * `POST /candidate.search` — find a person by email or name.
 *
 * ## Use this, not `candidate-list`, to answer "do we know this person"
 *
 * The two look interchangeable and are not. `.search` exists for a specific
 * lookup: it is **not paginated**, caps at 100 results, and answers in one
 * call. `.list` walks the entire organization a page at a time and is meant for
 * syncing. Asking "have we seen ada@example.com" with a full list is thousands
 * of records to answer a yes/no.
 *
 * ## Email is the reliable half
 *
 * Names collide, change and get typed differently; an email match is exact.
 * A referral or inbound-lead workflow that checks by name will find the wrong
 * Ada and attach an application to her.
 *
 * The result is deliberately **not logged**: a candidate's name and address are
 * personal data and often confidential — many of these people have not told
 * their employer they are looking.
 */
const action: ActionDefinition = {
  key: "candidate-search",
  type: "search",
  resource: "candidate",
  title: "Search candidates",
  description:
    "Find a person by email or name. Unpaginated and capped at 100 — the right call for 'do we " +
    "already know this person', where a full list is thousands of records for a yes/no.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      default: "",
      hint: "The reliable half. An email match is exact; names collide and get typed " +
        "differently.",
    },
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      advanced: true,
      hint: "Ashby caps this at 100 and does not paginate search.",
    },
  ],
  output: [
    { key: "candidates", type: "array", label: "Matches" },
    { key: "count", type: "number", label: "Matches found" },
    { key: "found", type: "boolean", label: "Whether anything matched" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.email ?? "").trim();
    const name = String(p.name ?? "").trim();
    if (!email && !name) {
      throw new Error("give an `email` or a `name` — Ashby's search needs something to match");
    }

    const results = await new AshbyClient(ctx).request<unknown[]>("candidate.search", {
      body: compact({ email, name, limit: Number(p.limit ?? 100) || undefined }),
    });
    const candidates = Array.isArray(results) ? results : [];

    // A count, never the people: these are candidates, and many have not told
    // their employer they are looking.
    ctx.log("info", "searched Ashby candidates", { count: candidates.length });
    return { candidates, count: candidates.length, found: candidates.length > 0 };
  },
};

export default action;
