import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/record-delete.ts";

Deno.test("record-delete: DELETEs with integer ids from a comma list", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ deletedIds: ["101", "102"] }) }]);
  const out = await action.execute(
    { moduleName: "crm", tableName: "contacts", recordIds: "101, 102" },
    ctx,
  );
  assertEquals(out.deletedIds, ["101", "102"]);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), { records: [101, 102] });
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules/crm/tables/contacts/records`);
});

Deno.test("record-delete: accepts an array of ids", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ deletedIds: ["5"] }) }]);
  await action.execute({ moduleName: "m", tableName: "t", recordIds: [5] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { records: [5] });
});

Deno.test("record-delete: an invalid or empty id list is rejected before any request", async () => {
  const { ctx, calls } = connCtx();
  for (const bad of ["", "1,abc", "0", "-3"]) {
    await assertRejects(
      async () => await action.execute({ moduleName: "m", tableName: "t", recordIds: bad }, ctx),
      Error,
    );
  }
  assertEquals(calls.length, 0);
});
