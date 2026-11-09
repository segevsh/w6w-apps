import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/candidate-list.ts";

interface Params {
  shortcode?: string;
  lookbackHours?: number;
}

const DEFAULT_LOOKBACK_HOURS = 24;

const trigger = pollFromListAction<Params>({
  key: "new-candidate",
  title: "New Candidate",
  description:
    "The run gets each candidate newly added to Workable, found by asking only for candidates created within the look-back window.",
  action,
  params: [
    {
      key: "shortcode",
      label: "Job shortcode",
      type: "string",
      hint: "Only candidates for this job. Leave empty for the whole account.",
    },
    {
      key: "lookbackHours",
      label: "Look-back window (hours)",
      type: "number",
      hint:
        "Each check asks Workable for candidates created in this window (default 24). Keep it longer than any gap between checks.",
    },
  ],
  input: ({ shortcode, lookbackHours }) => {
    const hours = typeof lookbackHours === "number" && lookbackHours > 0
      ? lookbackHours
      : DEFAULT_LOOKBACK_HOURS;
    return {
      shortcode: shortcode || undefined,
      createdAfter: new Date(Date.now() - hours * 3_600_000).toISOString(),
      limit: 50,
    };
  },
  nextPageInput: (_input, result) => {
    const nextUrl = (result as { nextUrl?: string }).nextUrl;
    return nextUrl ? { pageUrl: nextUrl } : undefined;
  },
  items: (result) => (result as { candidates?: unknown[] }).candidates ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Candidate ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "job", type: "object", label: "Job" },
    { key: "stage", type: "string", label: "Stage" },
  ],
  sample: {
    id: "ce4da98",
    name: "Ada Lovelace",
    email: "ada@example.com",
    created_at: "2026-11-09T10:00:00Z",
    job: { shortcode: "GROOV005", title: "Sales Representative" },
    stage: "Applied",
  },
  maxPages: 3,
});

export default trigger;
