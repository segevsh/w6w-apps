import { assertEquals } from "@std/assert";
import listAll from "../../actions/list-all-meetings.ts";
import { mockCtx } from "../_helpers.ts";

const page = (ids: string[], more: boolean) => ({
  body: { object: "list", has_more: more, data: ids.map((id) => ({ id })) },
});

Deno.test("list-all-meetings: follows the last id as cursor until has_more is false", async () => {
  const { ctx, calls } = mockCtx([page(["A", "B"], true), page(["C"], false)]);
  const out = await listAll.execute({ maxMeetings: 50, startTimeMsLt: 9 }, ctx) as {
    data: Array<{ id: string }>;
    count: number;
    has_more: boolean;
  };
  assertEquals(out.data.map((m) => m.id), ["A", "B", "C"]);
  assertEquals(out.count, 3);
  assertEquals(out.has_more, false);
  assertEquals(calls.length, 2);
  assertEquals(calls[0].url.split("?")[1], "limit=10&start_time_ms.lt=9");
  assertEquals(calls[1].url.split("?")[1], "limit=10&cursor=B&start_time_ms.lt=9");
});

Deno.test("list-all-meetings: stops at the maximum and shrinks the final page limit", async () => {
  const { ctx, calls } = mockCtx([page(["A", "B", "C"], true)]);
  const out = await listAll.execute({ maxMeetings: 3 }, ctx) as {
    count: number;
    has_more: boolean;
  };
  assertEquals(out.count, 3);
  assertEquals(out.has_more, true);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url.split("?")[1], "limit=3");
});

Deno.test("list-all-meetings: an empty page with has_more cannot loop forever", async () => {
  const { ctx, calls } = mockCtx([page([], true)]);
  const out = await listAll.execute({}, ctx) as { count: number };
  assertEquals(out.count, 0);
  assertEquals(calls.length, 1);
});
