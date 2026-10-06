import { assert, assertEquals, assertRejects } from "@std/assert";
import subscriberSearch from "../../actions/subscriber-search.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-search: POST /api/1/searchSubscriber/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await subscriberSearch.execute({ "subscriber": "a@b.co" } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/searchSubscriber/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), { "subscriber": "a@b.co" });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("subscriber-search: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await subscriberSearch.execute({ "subscriber": "a@b.co" } as never, ctx)
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("subscriber-search: an empty subscriber fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await subscriberSearch.execute({ "subscriber": "  " } as never, ctx),
    Error,
    "subscriber is required",
  );
  assertEquals(calls.length, 0);
});
