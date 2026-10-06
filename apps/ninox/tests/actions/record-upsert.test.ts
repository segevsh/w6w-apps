import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, errorBody, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/record-upsert.ts";

Deno.test("record-upsert: POSTs matchField + records and returns both id lists", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ createdIds: ["9"], updatedIds: ["3"] }) }]);
  const records = [{ email: "a@b.com", name: "A" }, { email: "c@d.com" }];
  const out = await action.execute(
    { moduleName: "crm", tableName: "contacts", matchField: "email", records },
    ctx,
  );
  assertEquals(out, { createdIds: ["9"], updatedIds: ["3"] });
  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/workspace/${WS}/modules/crm/tables/contacts/records/upsert`,
  );
  assertEquals(JSON.parse(calls[0].body!), { matchField: "email", records });
  assertEquals(action.idempotent, true);
});

Deno.test("record-upsert: a record missing the match value is rejected locally", async () => {
  const { ctx, calls } = connCtx();
  await assertRejects(
    async () =>
      await action.execute(
        { moduleName: "m", tableName: "t", matchField: "email", records: [{ name: "x" }] },
        ctx,
      ),
    Error,
    'match field "email"',
  );
  await assertRejects(
    async () =>
      await action.execute(
        { moduleName: "m", tableName: "t", matchField: " ", records: [{}] },
        ctx,
      ),
    Error,
    "matchField is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-upsert: an ambiguous match (409) is an error", async () => {
  const { ctx } = connCtx([{ status: 409, body: errorBody("Ambiguous match") }]);
  await assertRejects(
    async () =>
      await action.execute(
        { moduleName: "m", tableName: "t", matchField: "e", records: [{ e: "x" }] },
        ctx,
      ),
    Error,
    "Ambiguous match",
  );
});
