import { assert, assertEquals, assertRejects } from "@std/assert";
import subscriberUnsubscribe from "../../actions/subscriber-unsubscribe.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-unsubscribe: POST /api/1/unsubscribeSubscriber/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const out = await subscriberUnsubscribe.execute(
    { "list_id": 7, "email": "a@b.co" } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/unsubscribeSubscriber/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), { "list_id": "7", "email": "a@b.co" });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { ok: true });
});

Deno.test("subscriber-unsubscribe: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await subscriberUnsubscribe.execute({ "list_id": 7, "email": "a@b.co" } as never, ctx)
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("subscriber-unsubscribe: an empty list_id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await subscriberUnsubscribe.execute({ "list_id": "  ", "email": "a@b.co" } as never, ctx),
    Error,
    "list_id is required",
  );
  assertEquals(calls.length, 0);
});
