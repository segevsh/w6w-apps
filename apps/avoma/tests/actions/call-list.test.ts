import { assertEquals, assertRejects } from "@std/assert";
import callList from "../../actions/call-list.ts";
import { mockCtx, pageBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("call-list: GET /v1/calls/ with window and direction", async () => {
  const { ctx, calls } = mockCtx([{ body: pageBody([{ external_id: "e1" }]) }]);
  const out = await callList.execute({
    fromDate: "2026-10-01T00:00:00Z",
    toDate: "2026-10-02T00:00:00Z",
    direction: "inbound",
  }, ctx) as { results: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/calls/");
  assertEquals(queryOf(calls[0].url), {
    from_date: "2026-10-01T00:00:00Z",
    to_date: "2026-10-02T00:00:00Z",
    direction: "inbound",
  });
  assertEquals(out.results.length, 1);
});

Deno.test("call-list: no window and no next is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await callList.execute({}, ctx), Error, "fromDate");
  assertEquals(calls.length, 0);
});
