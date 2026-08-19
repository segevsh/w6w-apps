import type { ActionDefinition } from "@w6w/types";
import { LeverClient } from "../lib/client.ts";

/**
 * `GET /v1/archive_reasons` — why candidates get closed out, and which of
 * those means hired.
 *
 * ## The distinction between a rejection and a hire lives here
 *
 * `opportunity-archive` takes a reason id and does very different things
 * depending on it: an ordinary reason closes a candidate out, and one that
 * maps to **Hired** — with a requisition — records a hire and increments a
 * headcount. Nothing in the archive call itself distinguishes them.
 *
 * So this action separates the hire reasons from the rest, which is the
 * question a workflow needs answered before it archives anybody.
 *
 * ## Reasons are account configuration, and they change
 *
 * Recruiting teams edit them. A workflow with a hardcoded reason id archives
 * people under whatever that id has since become, and there is no error to
 * notice — the archive succeeds and the reporting is wrong.
 */
const action: ActionDefinition = {
  key: "archive-reason-list",
  type: "read",
  resource: "archive-reason",
  title: "List archive reasons",
  description:
    "Why candidates get closed out, and — the part that matters — which reasons count as a " +
    "HIRE. `opportunity-archive` behaves very differently depending on the reason, and nothing " +
    "in that call distinguishes them.",
  params: [],
  output: [
    { key: "reasons", type: "array", label: "The reasons" },
    { key: "count", type: "number", label: "How many" },
    { key: "byName", type: "object", label: "Name to id, for resolving at run time" },
    { key: "hiredReasons", type: "array", label: "Reasons that record a hire" },
    { key: "rejectionReasons", type: "array", label: "Everything else" },
    { key: "hiredReasonId", type: "string", label: "The first hire reason, if there is one" },
  ],

  async execute(_input, ctx) {
    const page = await new LeverClient(ctx).list<{ id?: string; text?: string; status?: string }>(
      "/archive_reasons",
      { query: { limit: 100 } },
    );

    const reasons = page.data;
    const byName: Record<string, string> = {};
    for (const reason of reasons) {
      if (reason?.text && reason?.id) byName[reason.text] = reason.id;
    }

    // Lever marks hire reasons by status where it can, and the text is the
    // fallback — either way this is the distinction that changes what
    // archiving does.
    const isHire = (reason: { text?: string; status?: string }) =>
      String(reason?.status ?? "").toLowerCase() === "hired" ||
      /^hired\b/i.test(String(reason?.text ?? ""));

    const hiredReasons = reasons.filter(isHire);

    return {
      reasons: reasons.map((reason) => ({
        id: reason?.id,
        name: reason?.text,
        status: reason?.status,
        isHire: isHire(reason),
      })),
      count: reasons.length,
      byName,
      hiredReasons: hiredReasons.map((reason) => reason?.text).filter(Boolean),
      rejectionReasons: reasons.filter((reason) => !isHire(reason)).map((reason) => reason?.text)
        .filter(Boolean),
      hiredReasonId: hiredReasons[0]?.id,
    };
  },
};

export default action;
