import { assert, assertEquals, assertRejects } from "@std/assert";
import segmentList from "../../actions/segment-list.ts";
import { errBody, mockCtx, pathOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof segmentList.execute>[1]) =>
  segmentList.execute({} as never, ctx) as Promise<unknown>;

Deno.test("segment-list: declares a read action", () => {
  assertEquals(segmentList.key, "segment-list");
  assertEquals(segmentList.type, "read");
  assert((segmentList.description ?? "").length > 0);
  assert(Array.isArray(segmentList.output) && segmentList.output.length > 0);
});

Deno.test("segment-list: GETs /segments and returns the segments list", async () => {
  const body = { segments: [{ id: 3, name: "Trials" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await run(ctx), body);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.encharge.io/v1/segments");
  assertEquals(pathOf(calls[0].url), "/v1/segments");
  assertEquals(calls[0].headers["x-encharge-token"], undefined);
});

Deno.test("segment-list: an Encharge failure is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("User not logged in") }]);
  await assertRejects(() => run(ctx), Error, "User not logged in");
});
