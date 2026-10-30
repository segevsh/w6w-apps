import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import tableGet from "../../actions/table-get.ts";

test("table-get: fetches a table by its alphanumeric id, quoted", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { table: { id: "ZtEdWh", name: "Vendors", public: false } } },
  }]);
  const out = await tableGet.execute({ id: "ZtEdWh" }, ctx) as { name: string };
  assertEquals(out.name, "Vendors");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith('{ table(id: "ZtEdWh") {'));
  assert(q.includes("table_fields { id label }"));
});

test("table-get: type/resource metadata", () => {
  assertEquals(tableGet.type, "read");
  assertEquals(tableGet.resource, "table");
});
