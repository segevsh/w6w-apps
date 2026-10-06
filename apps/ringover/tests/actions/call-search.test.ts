import { assertEquals } from "@std/assert";
import action from "../../actions/call-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("call-search: POSTs the filter body; expand rides the query", async () => {
  const { ctx, calls } = mockCtx([{
    body: { call_list_count: 1, total_call_count: 1, call_list: [{ cdr_id: 5 }] },
  }]);
  const out = await action.execute!({
    filter: "ADVANCED",
    advanced: '{"users":[1,2]}',
    tags: "4, 5",
    stars: "5",
    note: true,
    callType: ["MISSED"],
    expand: ["transcription"],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/calls");
  assertEquals(url.searchParams.get("expand"), "transcription");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    filter: "ADVANCED",
    advanced: { users: [1, 2] },
    tags: [4, 5],
    stars: [5],
    note: true,
    call_type: ["MISSED"],
  });
  assertEquals((out as { lastId: number }).lastId, 5);
});

Deno.test("call-search: a 204 is an empty page and an empty body is {}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].body, "{}");
  assertEquals((out as { calls: unknown[] }).calls, []);
});
