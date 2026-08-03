import { assertEquals } from "@std/assert";
import { ACCOUNT_BASE, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/envelope-get.ts";

Deno.test("envelope-get: GETs one envelope by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { envelopeId: "e1", status: "sent" } }]);
  const out = await action.execute({ envelopeId: "e1" }, ctx) as { status: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/e1`);
  assertEquals(out.status, "sent");
});

Deno.test("envelope-get: passes include and advanced_update", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { envelopeId: "e1", include: "recipients,documents", advancedUpdate: true },
    ctx,
  );
  const q = queryOf(calls[0]);
  assertEquals(q.get("include"), "recipients,documents");
  assertEquals(q.get("advanced_update"), "true");
});

Deno.test("envelope-get: URL-encodes an id with awkward characters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ envelopeId: "a/b c" }, ctx);
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/a%2Fb%20c`);
});

Deno.test("envelope-get: is a read action", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "envelope");
});
