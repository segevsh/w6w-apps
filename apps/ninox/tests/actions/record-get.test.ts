import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, pathOf, queryOf, WS } from "../_helpers.ts";
import action from "../../actions/record-get.ts";

Deno.test("record-get: uses the singular `record` path", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ id: "7", values: { name: "Ada" } }) }]);
  const out = await action.execute(
    { moduleName: "crm", tableName: "contacts", recordId: 7, fields: "name" },
    ctx,
  );
  assertEquals(out.record, { id: "7", values: { name: "Ada" } });
  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/workspace/${WS}/modules/crm/tables/contacts/record/7`,
  );
  assertEquals(queryOf(calls[0].url), { fields: "name" });
});

Deno.test("record-get: rejects a non-integer id before any request", async () => {
  const { ctx, calls } = connCtx();
  await assertRejects(
    async () =>
      await action.execute({ moduleName: "crm", tableName: "contacts", recordId: "1/../2" }, ctx),
    Error,
    "not a record id",
  );
  assertEquals(calls.length, 0);
});
