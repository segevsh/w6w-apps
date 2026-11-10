import { DocuSealClient, type DocuSealList } from "../lib/client.ts";
import { sinceTrigger } from "../lib/triggers.ts";

export default sinceTrigger({
  key: "new-completed-submitter",
  title: "New Completed Submitter",
  description: "The run gets each submitter who has just completed signing a DocuSeal form.",
  async load(since, _params, ctx, at) {
    // Three pages of 100 per check; DocuSeal's own `after` cursor (`pagination.next`) is the resume
    // position, so a window of any size drains across checks (brief §9.8).
    const client = new DocuSealClient(ctx);
    const out: unknown[] = [];
    let after: number | undefined = at === undefined ? undefined : Number(at);
    let next: string | undefined;
    for (let page = 0; page < 3; page++) {
      const body = await client.request<DocuSealList<unknown>>("/submitters", {
        query: { completed_after: since, limit: 100, after },
      });
      const chunk = body?.data ?? [];
      out.push(...chunk);
      const cursor = body?.pagination?.next;
      if (chunk.length === 0 || cursor === null || cursor === undefined) break;
      after = cursor;
      if (page === 2) next = String(cursor);
    }
    return { items: out, next };
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) =>
    Date.parse(String((item as { completed_at?: unknown }).completed_at ?? "")) || 0,
  output: [
    { key: "id", type: "number", label: "Submitter ID" },
    { key: "submission_id", type: "number", label: "Submission ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "completed_at", type: "string", label: "Completed at" },
  ],
  sample: {
    id: 7,
    submission_id: 3,
    email: "signer@example.com",
    status: "completed",
    completed_at: "2026-11-09T10:00:00.000Z",
  },
});
