import { assertEquals } from "@std/assert";
import postList from "../../actions/post-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("post-list: GET /v2/scheduler/posts with the range and blogId", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1 }]) }]);
  const out = await postList.execute({
    blogId: "9",
    start: "2026-11-01T00:00:00",
    end: "2026-11-30T23:59:59",
    timezone: "Europe/Madrid",
  }, ctx);
  assertEquals(out, { items: [{ id: 1 }], count: 1 });
  assertEquals(pathOf(calls[0].url), "/api/v2/scheduler/posts");
  assertEquals(queryOf(calls[0].url), {
    blogId: "9",
    start: "2026-11-01T00:00:00",
    end: "2026-11-30T23:59:59",
    timezone: "Europe/Madrid",
  });
});
