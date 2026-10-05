import { assertEquals, assertRejects } from "@std/assert";
import getLive from "../../actions/get-live-meeting.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-live-meeting: hits /live with gte filter and only live-valid expansions", async () => {
  const body = { id: "01HF", end_time_ms: null, transcript: { turns: [], text: "" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await getLive.execute({
    meetingId: "01HF",
    startTimeMsGte: 1733800000000,
    startTimeMsLt: 5, // not a documented live filter — must not be sent
    expand: ["transcript", "summary"], // summary is not available live
  } as never, ctx);
  assertEquals(out, body);
  assertEquals(pathOf(calls[0].url), "/v1/meetings/01HF/live");
  assertEquals(calls[0].url.split("?")[1], "start_time_ms.gte=1733800000000&expand[]=transcript");
});

Deno.test("get-live-meeting: requires a meeting id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await getLive.execute({ meetingId: "" }, ctx),
    Error,
    "meetingId",
  );
  assertEquals(calls.length, 0);
});
