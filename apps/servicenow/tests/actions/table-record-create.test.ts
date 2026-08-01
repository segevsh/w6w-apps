import { assertEquals } from "@std/assert";
import { mockServiceNowCtx } from "../_helpers.ts";
import action from "../../actions/table-record-create.ts";

Deno.test("table-record-create: POSTs /table/{table} with the given fields", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: { sys_id: "1" } } }]);
  await action.execute({ table: "problem", fields: { short_description: "New problem" } }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.service-now.com/api/now/table/problem");
  assertEquals(JSON.parse(calls[0].body!), { short_description: "New problem" });
});

Deno.test("table-record-create: encodes the table name and accepts a JSON string", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: {} } }]);
  await action.execute({ table: "u_my table", fields: '{"x": 1}' }, ctx);
  assertEquals(calls[0].url, "https://acme.service-now.com/api/now/table/u_my%20table");
  assertEquals(JSON.parse(calls[0].body!), { x: 1 });
});
