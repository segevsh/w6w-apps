import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/issue-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("issue-list: GETs /issues with the required time range and cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "i1" }], pagination: { cursor: "c2", has_next_page: true } },
  }]);
  const out = await action.execute!({
    startTime: "2026-01-01T00:00:00Z",
    endTime: "2026-02-01T00:00:00Z",
    cursor: "c1",
    limit: 50,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.usepylon.com/issues");
  assertEquals(Object.fromEntries(url.searchParams), {
    start_time: "2026-01-01T00:00:00Z",
    end_time: "2026-02-01T00:00:00Z",
    cursor: "c1",
    limit: "50",
  });
  assertEquals(out, { issues: [{ id: "i1" }], hasNextPage: true, nextCursor: "c2" });
});

Deno.test("issue-list: the last page has no nextCursor, and the range params are required", async () => {
  const { ctx } = mockCtx([{
    body: { data: [], pagination: { cursor: "stale", has_next_page: false } },
  }]);
  const out = await action.execute!({ startTime: "a", endTime: "b" }, ctx);
  assertEquals(out, { issues: [], hasNextPage: false });
  const required = action.params!.filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["startTime", "endTime"]);
});

Deno.test("issue-list: surfaces the error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { errors: ["range too long"], request_id: "r", code: "invalid_request_body" },
  }]);
  await assertRejects(
    async () => await action.execute!({ startTime: "a", endTime: "b" }, ctx),
    Error,
    "range too long (invalid_request_body)",
  );
});
