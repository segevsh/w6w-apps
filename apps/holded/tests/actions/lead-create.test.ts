import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import leadCreate from "../../actions/lead-create.ts";
import { asMutation, mockCtx, writeResult } from "../_helpers.ts";

test("lead-create: metadata — not idempotent", () => {
  assertEquals(leadCreate.type, "perform");
  assertEquals(leadCreate.idempotent, false);
});

test("lead-create: POST /leads with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: writeResult("Created", "new-id") }]);
  const result = asMutation(
    await leadCreate.execute({
      funnelId: "f1",
      name: "Gumersindo",
      value: 48000,
    }, ctx),
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { funnelId: "f1", name: "Gumersindo", value: 48000 });
  assertEquals(result.id, "new-id");
});

test("lead-create: omits contactId/contactName/potential/dueDate/stageId when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: writeResult("Created", "new-id") }]);
  await leadCreate.execute({ funnelId: "f1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { funnelId: "f1" });
});
