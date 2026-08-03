import { assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/records-modified-since.ts";

const body = (raw: string | null) => JSON.parse(raw!);

Deno.test("records-modified-since: posts `from` and `after`", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { count: 0, changes: [] } }]);
  await action.execute({ tableId: "bck1", after: "2026-08-01T00:00:00Z" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/records/modifiedSince");
  assertEquals(body(calls[0].body), { from: "bck1", after: "2026-08-01T00:00:00Z" });
});

Deno.test("records-modified-since: forwards fieldList and includeDetails", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute(
    { tableId: "bck1", after: "2026-08-01T00:00:00Z", fieldList: "[6,7]", includeDetails: true },
    ctx,
  );
  assertEquals(body(calls[0].body).fieldList, [6, 7]);
  assertEquals(body(calls[0].body).includeDetails, true);
});

Deno.test("records-modified-since: surfaces deletions and the truncation flag", async () => {
  // Reporting deletions is the reason this exists — a query-based poll cannot.
  const { ctx } = mockQbCtx([{
    body: {
      count: 2,
      changes: [
        { recordId: 1, timestamp: "2026-08-02T10:00:00Z", changeType: "MODIFY" },
        { recordId: 2, timestamp: "2026-08-02T11:00:00Z", changeType: "DELETE" },
      ],
      deletesTruncated: true,
    },
  }]);
  const out = await action.execute({ tableId: "bck1", after: "2026-08-01T00:00:00Z" }, ctx);

  assertEquals(out.count, 2);
  assertEquals(out.changes![1].changeType, "DELETE");
  assertEquals(out.deletesTruncated, true);
});
