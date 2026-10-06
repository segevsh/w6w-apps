import { assert, assertEquals, assertRejects } from "@std/assert";
import subscriberDetailsGet from "../../actions/subscriber-details-get.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-details-get: POST /api/1/getSubscriberDetails/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await subscriberDetailsGet.execute(
    { "list_id": 7, "subscriber": "a@b.co" } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/getSubscriberDetails/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), { "list_id": "7", "subscriber": "a@b.co" });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("subscriber-details-get: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await subscriberDetailsGet.execute({ "list_id": 7, "subscriber": "a@b.co" } as never, ctx)
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("subscriber-details-get: an empty list_id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await subscriberDetailsGet.execute({ "list_id": "  ", "subscriber": "a@b.co" } as never, ctx),
    Error,
    "list_id is required",
  );
  assertEquals(calls.length, 0);
});
