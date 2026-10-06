import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, errorBody, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/record-update.ts";

Deno.test("record-update: PATCHes {records} with ids", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ updatedIds: ["1"] }) }]);
  const out = await action.execute(
    { moduleName: "crm", tableName: "contacts", records: [{ id: 1, name: "Z" }] },
    ctx,
  );
  assertEquals(out.updatedIds, ["1"]);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules/crm/tables/contacts/records`);
  assertEquals(JSON.parse(calls[0].body!), { records: [{ id: 1, name: "Z" }] });
  assertEquals(action.idempotent, true);
});

Deno.test("record-update: an entry without a positive integer id is rejected locally", async () => {
  const { ctx, calls } = connCtx();
  for (const bad of [{ name: "x" }, { id: 0 }, { id: "abc" }, { id: 1.5 }]) {
    await assertRejects(
      async () => await action.execute({ moduleName: "m", tableName: "t", records: [bad] }, ctx),
      Error,
      "positive integer id",
    );
  }
  assertEquals(calls.length, 0);
});

Deno.test("record-update: a 413 is an error", async () => {
  const { ctx } = connCtx([{ status: 413, body: errorBody("Payload too large") }]);
  await assertRejects(
    async () =>
      await action.execute({ moduleName: "m", tableName: "t", records: [{ id: 1 }] }, ctx),
    Error,
    "Payload too large",
  );
});
