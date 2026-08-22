import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-get.ts";

Deno.test("asset-get: reads one asset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "a1", status: "ready" } } }]);
  await action.execute!({ assetId: "a1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/video/v1/assets/a1");
});

/** `errored` is permanent and the reason is in `errors`. */
Deno.test("asset-get: an errored asset is surfaced as a warning", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: {
      data: { id: "a1", status: "errored", errors: { messages: ["could not fetch input"] } },
    },
  }]);
  await action.execute!({ assetId: "a1" }, ctx);
  assert(logs.some((l) => l.level === "warn" && /failed to process/.test(l.message)));
});

Deno.test("asset-get: a ready asset logs nothing alarming", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { data: { status: "ready" } } }]);
  await action.execute!({ assetId: "a1" }, ctx);
  assertEquals(logs.filter((l) => l.level === "warn").length, 0);
});

Deno.test("asset-get: a missing id is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "assetId");
});
