import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, errorBody, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/record-create.ts";

Deno.test("record-create: POSTs {records} and returns the ids", async () => {
  const { ctx, calls } = connCtx([{ status: 201, body: envelope({ ids: ["11", "12"] }) }]);
  const out = await action.execute(
    { moduleName: "crm", tableName: "contacts", records: [{ name: "A" }, { name: "B" }] },
    ctx,
  );
  assertEquals(out.ids, ["11", "12"]);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/modules/crm/tables/contacts/records`);
  assertEquals(JSON.parse(calls[0].body!), { records: [{ name: "A" }, { name: "B" }] });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(action.idempotent, false);
});

Deno.test("record-create: accepts records as a JSON string", async () => {
  const { ctx, calls } = connCtx([{ status: 201, body: envelope({ ids: ["1"] }) }]);
  await action.execute({ moduleName: "m", tableName: "t", records: '[{"a":1}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { records: [{ a: 1 }] });
});

Deno.test("record-create: empty or non-object records are rejected before any request", async () => {
  const { ctx, calls } = connCtx();
  await assertRejects(
    async () => await action.execute({ moduleName: "m", tableName: "t", records: [] }, ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () =>
      await action.execute({ moduleName: "m", tableName: "t", records: ["x"] as never }, ctx),
    Error,
    "JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-create: a 400 carries the vendor message", async () => {
  const { ctx } = connCtx([{ status: 400, body: errorBody("Unknown field zzz") }]);
  await assertRejects(
    async () =>
      await action.execute({ moduleName: "m", tableName: "t", records: [{ zzz: 1 }] }, ctx),
    Error,
    "Unknown field zzz",
  );
});
