import { assertEquals, assertRejects } from "@std/assert";
import auditEventList from "../../actions/audit-event-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("audit-event-list: maps filters to the vendor query", async () => {
  const page = { events: [], hasMore: false, cursor: null };
  const { ctx, calls } = mockCtx([{ body: page }]);
  assertEquals(
    await auditEventList.execute({
      action: "workspace",
      occurredAfter: "2026-09-01",
      occurredBefore: "2026-10-01",
      cursor: "c",
      pageSize: 30,
    }, ctx),
    page,
  );
  assertEquals(pathOf(calls[0].url), "/v1/audit");
  assertEquals(queryOf(calls[0].url), {
    action: "workspace",
    occurred_after: "2026-09-01",
    occurred_before: "2026-10-01",
    cursor: "c",
    page_size: "30",
  });
});

Deno.test("audit-event-list: a date outside retention is the vendor's 400", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BAD_REQUEST", message: "retention" } }]);
  await assertRejects(
    async () => await auditEventList.execute({ occurredAfter: "2020-01-01" }, ctx),
    Error,
    "retention",
  );
});
