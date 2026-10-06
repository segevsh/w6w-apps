import { assert, assertEquals, assertRejects } from "@std/assert";
import listSubscriberStatsGet from "../../actions/list-subscriber-stats-get.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-subscriber-stats-get: POST /api/1/getListSubsStats/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await listSubscriberStatsGet.execute(
    { "list_id": 7, "block_index": 2 } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/getListSubsStats/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), { "list_id": "7", "block_index": "2" });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("list-subscriber-stats-get: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await listSubscriberStatsGet.execute({ "list_id": 7, "block_index": 2 } as never, ctx)
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("list-subscriber-stats-get: an empty list_id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await listSubscriberStatsGet.execute({ "list_id": "  ", "block_index": 2 } as never, ctx),
    Error,
    "list_id is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("list-subscriber-stats-get: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  await listSubscriberStatsGet.execute({ "list_id": 7 } as never, ctx);
  assertEquals(formOf(calls[0]), { "list_id": "7" });
});
