import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, errorBody, listEnvelope, pathOf, queryOf, WS } from "../_helpers.ts";
import action from "../../actions/record-list.ts";

Deno.test("record-list: sends filter (never the deprecated `filters`), fields, sort, paging", async () => {
  const rows = [{ id: "1", values: { name: "Ada" } }];
  const { ctx, calls } = connCtx([{ body: listEnvelope(rows, { has_more: true, offset: 10 }) }]);
  const out = await action.execute({
    moduleName: "crm",
    tableName: "contacts",
    fields: "name, email",
    filter: { email: "a@b.com" },
    sort: "name,-_md",
    limit: 50,
    offset: 10,
  }, ctx);
  assertEquals(out, { records: rows, hasMore: true, offset: 10 });
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules/crm/tables/contacts/records`);
  const q = queryOf(calls[0].url);
  assertEquals(q, {
    fields: "name,email",
    filter: '{"email":"a@b.com"}',
    sort: "name,-_md",
    limit: "50",
    offset: "10",
  });
  assertEquals("filters" in q, false);
});

Deno.test("record-list: accepts the filter as a JSON string", async () => {
  const { ctx, calls } = connCtx([{ body: listEnvelope([]) }]);
  await action.execute(
    { moduleName: "crm", tableName: "contacts", filter: '{"a": 1}' },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).filter, '{"a":1}');
});

Deno.test("record-list: an invalid filter string is rejected before any request", async () => {
  const { ctx, calls } = connCtx();
  await assertRejects(
    async () =>
      await action.execute({ moduleName: "crm", tableName: "contacts", filter: "{nope" }, ctx),
    Error,
    "filter is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-list: a 404 for an unknown table is an error", async () => {
  const { ctx } = connCtx([{ status: 404, body: errorBody("Table not found") }]);
  await assertRejects(
    async () => await action.execute({ moduleName: "crm", tableName: "nope" }, ctx),
    Error,
    "Table not found",
  );
});
