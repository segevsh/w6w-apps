import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, errorBody, pathOf, queryOf, WS } from "../_helpers.ts";
import action from "../../actions/schema-changes-list.ts";

Deno.test("schema-changes-list: sends since/asOf/limit/offset and returns meta", async () => {
  const { ctx, calls } = connCtx([{
    body: {
      data: [{ action: "created", changedAt: "t", id: "x", kind: "Table" }],
      meta: { asOf: "2026-02-01T00:00:00Z", retentionCutoff: null },
      page_info: { has_more: true },
    },
  }]);
  const out = await action.execute(
    { since: "2026-01-01T00:00:00Z", asOf: "2026-01-31T00:00:00Z", limit: 50, offset: 5 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/schema/changes`);
  assertEquals(queryOf(calls[0].url), {
    since: "2026-01-01T00:00:00Z",
    asOf: "2026-01-31T00:00:00Z",
    limit: "50",
    offset: "5",
  });
  assertEquals(out.changes.length, 1);
  assertEquals(out.hasMore, true);
  assertEquals(out.asOf, "2026-02-01T00:00:00Z");
  assertEquals(out.retentionCutoff, null);
});

Deno.test("schema-changes-list: a 400 for a missing since carries the vendor message", async () => {
  const { ctx } = connCtx([{ status: 400, body: errorBody("since is required") }]);
  await assertRejects(
    async () => await action.execute({ since: "" }, ctx),
    Error,
    "since is required",
  );
});
