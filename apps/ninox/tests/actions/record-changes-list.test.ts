import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, errorBody, pathOf, queryOf, WS } from "../_helpers.ts";
import action from "../../actions/record-changes-list.ts";

Deno.test("record-changes-list: sends since and returns the next asOf", async () => {
  const changes = [{ id: "1", changeType: "update", changedAt: "2026-01-02T00:00:00Z" }];
  const { ctx, calls } = connCtx([{
    body: { data: changes, meta: { asOf: "2026-01-03T00:00:00Z" }, page_info: { has_more: false } },
  }]);
  const out = await action.execute(
    { moduleName: "crm", tableName: "contacts", since: "2026-01-01T00:00:00Z", limit: 100 },
    ctx,
  );
  assertEquals(out, { changes, hasMore: false, asOf: "2026-01-03T00:00:00Z" });
  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/workspace/${WS}/modules/crm/tables/contacts/records/changes`,
  );
  assertEquals(queryOf(calls[0].url), { since: "2026-01-01T00:00:00Z", limit: "100" });
});

Deno.test("record-changes-list: a table without history is a 400 error", async () => {
  const { ctx } = connCtx([{ status: 400, body: errorBody("History tracking is disabled") }]);
  await assertRejects(
    async () =>
      await action.execute({
        moduleName: "crm",
        tableName: "contacts",
        since: "2026-01-01T00:00:00Z",
      }, ctx),
    Error,
    "History tracking",
  );
});
