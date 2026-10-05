import { assertEquals, assertRejects } from "@std/assert";
import getMeeting from "../../actions/get-meeting.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-meeting: requests the meeting with expand[] and returns the body verbatim", async () => {
  const body = { id: "01HF", title: "Sync", summary: "s", metrics: { read_score: 0.9 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await getMeeting.execute({ meetingId: "01HF", expand: ["summary", "metrics"] }, ctx);
  assertEquals(out, body);
  assertEquals(pathOf(calls[0].url), "/v1/meetings/01HF");
  assertEquals(calls[0].url.split("?")[1], "expand[]=summary&expand[]=metrics");
});

Deno.test("get-meeting: the id is path-encoded and required", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await getMeeting.execute({ meetingId: "a/b" }, ctx);
  assertEquals(calls[0].url, "https://api.read.ai/v1/meetings/a%2Fb");
  await assertRejects(
    async () => await getMeeting.execute({ meetingId: " " }, ctx),
    Error,
    "meetingId",
  );
});

Deno.test("get-meeting: a 404 carries the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { detail: "Not Found" } }]);
  await assertRejects(
    async () => await getMeeting.execute({ meetingId: "x" }, ctx),
    Error,
    "Read AI 404",
  );
});
