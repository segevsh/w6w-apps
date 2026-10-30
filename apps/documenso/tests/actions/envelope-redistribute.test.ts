import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-redistribute.ts";

const conn = { display: {} };

/** Naming none re-sends to everyone still outstanding. */
test("envelope-redistribute: sends the numeric recipient ids when named", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ envelopeId: "e1", recipients: "12, 13" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { envelopeId: "e1", recipients: [12, 13] });
});

test("envelope-redistribute: with none named it sends only the envelope", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ envelopeId: "e1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { envelopeId: "e1" });
  assertEquals((logs[0].data as { recipients: string }).recipients, "everyone outstanding");
});

test("envelope-redistribute: a non-numeric recipient is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ envelopeId: "e1", recipients: "ada" }, ctx),
    Error,
    "not a numeric id",
  );
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
});
