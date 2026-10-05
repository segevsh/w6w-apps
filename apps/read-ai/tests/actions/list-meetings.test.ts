import { assertEquals, assertRejects } from "@std/assert";
import listMeetings from "../../actions/list-meetings.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-meetings: sends filters, cursor and expand[] and derives next_cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { object: "list", has_more: true, data: [{ id: "A" }, { id: "B" }] },
  }]);
  const out = await listMeetings.execute({
    limit: 2,
    cursor: "PREV",
    startTimeMsGte: 100,
    expand: ["summary", "nope"],
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v1/meetings");
  assertEquals(
    calls[0].url.split("?")[1],
    "limit=2&cursor=PREV&start_time_ms.gte=100&expand[]=summary",
  );
  assertEquals(out.has_more, true);
  assertEquals(out.next_cursor, "B");
  assertEquals((out.data as unknown[]).length, 2);
});

Deno.test("list-meetings: last page has no next_cursor", async () => {
  const { ctx } = mockCtx([{ body: { object: "list", has_more: false, data: [{ id: "A" }] } }]);
  const out = await listMeetings.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.has_more, false);
  assertEquals(out.next_cursor, undefined);
});

Deno.test("list-meetings: surfaces vendor errors", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { detail: "slow down" } }]);
  await assertRejects(
    async () => await listMeetings.execute({}, ctx),
    Error,
    "Read AI 429: slow down",
  );
});
