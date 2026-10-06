import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transcription-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transcription-list: sends no query when nothing is set", async () => {
  const page = { first: "f", current: "c", next: null, items: [] };
  const { ctx, calls } = mockCtx([{ body: page }]);
  assertEquals(await action.execute({}, ctx), page);
  assertEquals(pathOf(calls[0].url), "/v2/pre-recorded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("transcription-list: status repeats the key; dates and paging use snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({
    status: ["done", "error"],
    date: "2026-10-06",
    afterDate: "2026-10-01T00:00:00.000Z",
    beforeDate: "2026-10-07T00:00:00.000Z",
    limit: 5,
    offset: 10,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("status"), ["done", "error"]);
  assertEquals(q.get("date"), "2026-10-06");
  assertEquals(q.get("after_date"), "2026-10-01T00:00:00.000Z");
  assertEquals(q.get("before_date"), "2026-10-07T00:00:00.000Z");
  assertEquals(q.get("limit"), "5");
  assertEquals(q.get("offset"), "10");
});

Deno.test("transcription-list: offset 0 is still sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ offset: 0 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "0");
});

Deno.test("transcription-list: a 401 throws", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(401, "gladia user not found") }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "gladia user not found");
});
