import { assert, assertEquals, assertRejects } from "@std/assert";
import listStatsGet from "../../actions/list-stats-get.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-stats-get: POST /api/1/getListStats/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await listStatsGet.execute({ "list_id": 7 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/getListStats/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), { "list_id": "7" });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("list-stats-get: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await listStatsGet.execute({ "list_id": 7 } as never, ctx)
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("list-stats-get: an empty list_id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await listStatsGet.execute({ "list_id": "  " } as never, ctx),
    Error,
    "list_id is required",
  );
  assertEquals(calls.length, 0);
});
