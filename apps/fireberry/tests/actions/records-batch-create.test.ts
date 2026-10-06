import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/records-batch-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("records-batch-create: sends POST /api/v3/record/{n}/batch/create wrapping records in data", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await action.execute!(
    { objectNumber: 1, records: [{ accountname: "A" }, { accountname: "B" }] },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/v3/record/1/batch/create");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { data: [{ accountname: "A" }, { accountname: "B" }] });
  assertEquals(out, { result: { success: true } });
});

Deno.test("records-batch-create: accepts JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ objectNumber: 2, records: '[{"lastname":"Doe"}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { data: [{ lastname: "Doe" }] });
});

Deno.test("records-batch-create: refuses an empty list and more than 20 records, with no request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ objectNumber: 1, records: [] }, ctx),
    Error,
    "non-empty",
  );
  const many = Array.from({ length: 21 }, (_, i) => ({ accountname: `n${i}` }));
  await assertRejects(
    async () => await action.execute!({ objectNumber: 1, records: many }, ctx),
    Error,
    "at most 20",
  );
  assertEquals(calls.length, 0);
});

Deno.test("records-batch-create: sends no tokenid header and surfaces vendor errors", async () => {
  const ok = mockCtx([{ body: {} }]);
  await action.execute!({ objectNumber: 1, records: [{ a: 1 }] }, ok.ctx);
  assert(!("tokenid" in ok.calls[0].headers));
  const bad = mockCtx([{ status: 400, body: { message: "bad batch" } }]);
  await assertRejects(
    async () => await action.execute!({ objectNumber: 1, records: [{ a: 1 }] }, bad.ctx),
    Error,
    "bad batch",
  );
});

Deno.test("records-batch-create: is not idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
