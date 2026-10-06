import { assert, assertEquals, assertRejects } from "@std/assert";
import segmentList from "../../actions/segment-list.ts";
import { errorBody, listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("segment-list: GETs /v1/segments with paging", async () => {
  const { ctx, calls } = mockCtx([{
    body: listPage([{ uuid: "s1", name: "Power", is_manual: true }]),
  }]);
  const out = await segmentList.execute({ page: 1, pageLength: 10 }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/segments");
  assertEquals(queryOf(calls[0].url), { page: "1", page_length: "10" });
  assertEquals(out.items.length, 1);
});

Deno.test("segment-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(segmentList.execute({}, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
