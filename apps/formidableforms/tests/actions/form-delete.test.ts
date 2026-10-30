import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { BASE_PATH, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-delete.ts";

test("form-delete: throws without a network call when confirm is not true", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute({ formId: 25, confirm: false }, ctx),
    Error,
    "confirm",
  );
  assertEquals(calls.length, 0);
});

test("form-delete: DELETEs /forms/{id} when confirmed", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ formId: 25, confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/25`);
});

test("form-delete: logs a warning when confirmed", async () => {
  const { ctx, logs } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ formId: 25, confirm: true }, ctx);
  assert(logs.some((l) => l.level === "warn"));
});
