import { assertEquals } from "@std/assert";
import ringOutCreate from "../../actions/ring-out-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ring-out-create: posts from/to (and drops an unset callerId)", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "ro1", status: { callStatus: "InProgress" } } },
  ]);
  const out = await ringOutCreate.execute(
    { from: "+15550000000", to: "+15550000001" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/~/extension/~/ring-out");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    from: { phoneNumber: "+15550000000" },
    to: { phoneNumber: "+15550000001" },
  });
  assertEquals(out.id, "ro1");
});

Deno.test("ring-out-create: an explicit callerId is nested the same way as from/to", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ro2" } }]);
  await ringOutCreate.execute(
    { from: "+15550000000", to: "+15550000001", callerId: "+15550000002", playPrompt: true },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.callerId, { phoneNumber: "+15550000002" });
  assertEquals(body.playPrompt, true);
});

Deno.test("ring-out-create: is not idempotent — no idempotency key is documented", () => {
  assertEquals(ringOutCreate.idempotent, false);
});
