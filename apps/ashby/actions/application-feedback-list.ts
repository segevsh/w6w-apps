import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, epochMillis } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `POST /applicationFeedback.list` — the interview scorecards.
 *
 * ## Why the response is shaped so oddly, and what to do about it
 *
 * Each submission arrives as two halves: a **`formDefinition`** describing the
 * fields, and **`submittedValues`** keyed by field path. That is because every
 * organisation designs its own scorecards, so there is no fixed schema to read.
 *
 * The consequence to know: **selections come back as the stored value, not the
 * displayed label** — `"hire"`, not `"Hire"`. A workflow matching on the label
 * it sees in the Ashby UI matches nothing. The mapping lives in the form
 * definition's `selectableValues`, so this action resolves it and returns
 * `submissions` with labels attached alongside the raw values.
 *
 * Scores are `1`–`4` on Ashby's scale, and a `Score` field can carry comments.
 *
 * ## This is the most sensitive data in the app
 *
 * Interview feedback is candid, written about a named person, and frequently
 * unflattering. It is returned because a workflow may legitimately need it —
 * routing a strong candidate, flagging a stalled debrief — and it is never
 * logged, not even in summary.
 */
interface FormField {
  path?: string;
  title?: string;
  type?: string;
  selectableValues?: Array<{ value?: string; label?: string }>;
}

const action: ActionDefinition = {
  key: "application-feedback-list",
  type: "read",
  resource: "feedback",
  title: "List interview feedback",
  description:
    "Scorecards for an application. Selections come back as stored VALUES, not the labels shown " +
    "in Ashby — so this resolves the labels from the form definition for you.",
  params: [
    {
      key: "applicationId",
      label: "Application ID",
      type: "string",
      default: "",
      hint: "Blank walks every submission in the organisation, which is what a sync wants.",
    },
    { key: "createdAfter", label: "Created After", type: "datetime", default: "" },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "submissions", type: "array", label: "Feedback, with labels resolved" },
    { key: "count", type: "number", label: "Submissions returned" },
    { key: "syncToken", type: "string", label: "Store this and pass it next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new AshbyClient(ctx);
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll<{
      formDefinition?: { fields?: FormField[] };
      submittedValues?: Record<string, unknown>;
    }>(
      "applicationFeedback.list",
      compact({
        applicationId: p.applicationId,
        syncToken: p.syncToken,
        createdAfter: epochMillis(p.createdAfter, "createdAfter"),
      }),
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    const submissions = page.items.map((submission) => {
      const fields = submission?.formDefinition?.fields ?? [];
      const values = submission?.submittedValues ?? {};
      const labelled: Record<string, unknown> = {};
      for (const field of fields) {
        const path = String(field?.path ?? "");
        if (!path || !(path in values)) continue;
        const raw = values[path];
        const options = field?.selectableValues ?? [];
        const label = (v: unknown) => options.find((o) => o?.value === v)?.label ?? (v as unknown);
        labelled[path] = {
          title: field?.title,
          type: field?.type,
          value: raw,
          label: Array.isArray(raw) ? raw.map(label) : label(raw),
        };
      }
      return { ...submission, labelledValues: labelled };
    });

    // A count only. Interview feedback is candid, about a named person.
    ctx.log("info", "read Ashby interview feedback", { count: submissions.length });
    return { submissions, count: submissions.length, syncToken: page.syncToken };
  },
};

export default action;
