import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/records-batch-update.ts";
import { mockCtx } from "../_helpers.ts";

const UPDATES = [{ id: "a1", record: { accountname: "X" } }];

test("records-batch-update: sends POST /api/v3/record/{n}/batch/update wrapping updates in data", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await action.execute!({ objectNumber: 1, updates: UPDATES }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v3/record/1/batch/update");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { data: UPDATES });
  assertEquals(out, { result: { success: true } });
});

test("records-batch-update: accepts JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ objectNumber: 1, updates: JSON.stringify(UPDATES) }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { data: UPDATES });
});

test("records-batch-update: refuses an empty list and more than 20, with no request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ objectNumber: 1, updates: "[]" }, ctx),
    Error,
    "non-empty",
  );
  const many = Array.from({ length: 21 }, (_, i) => ({ id: `i${i}`, record: {} }));
  await assertRejects(
    async () => await action.execute!({ objectNumber: 1, updates: many }, ctx),
    Error,
    "at most 20",
  );
  assertEquals(calls.length, 0);
});

test("records-batch-update: sends no tokenid header and surfaces vendor errors", async () => {
  const ok = mockCtx([{ body: {} }]);
  await action.execute!({ objectNumber: 1, updates: UPDATES }, ok.ctx);
  assert(!("tokenid" in ok.calls[0].headers));
  const bad = mockCtx([{ status: 403, body: { message: "no permission" } }]);
  await assertRejects(
    async () => await action.execute!({ objectNumber: 1, updates: UPDATES }, bad.ctx),
    Error,
    "no permission",
  );
});

test("records-batch-update: is idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
