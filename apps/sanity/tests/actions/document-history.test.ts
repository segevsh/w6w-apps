import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-history.ts";

const conn = { display: { projectId: "abc123", dataset: "production" } };

Deno.test("document-history: asks for a document as of a moment", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { documents: [] } }], conn);
  await action.execute!({ id: "a", time: "2026-08-01T00:00:00Z" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2025-02-19/data/history/production/documents/a");
  assertEquals(url.searchParams.get("time"), "2026-08-01T00:00:00Z");
});

Deno.test("document-history: a time and a revision together are refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ id: "a", time: "2026-08-01", revision: "r" }, ctx),
    Error,
    "different questions",
  );
  assertEquals(calls.length, 0);
});
