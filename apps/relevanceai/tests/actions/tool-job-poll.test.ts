import { assert, assertEquals } from "@std/assert";
import toolJobPoll from "../../actions/tool-job-poll.ts";
import { mockRelevanceCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tool-job-poll: GETs both ids in the path, with the cursor and page size", async () => {
  const { ctx, calls } = mockRelevanceCtx([
    { body: { type: "complete", updates: [{ message: "done" }], last_message_id: 42 } },
  ]);
  const out = await toolJobPoll.execute(
    { toolId: "s1", jobId: "j1", afterMessageId: 7, pageSize: 50 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/latest/studios/s1/async_poll/j1");
  assertEquals(calls[0].method, "GET");
  assertEquals(queryOf(calls[0].url), { after_message_id: "7", page_size: "50" });
  assertEquals(out.last_message_id, 42);
});

Deno.test("tool-job-poll: a timeout is a state, not an error", async () => {
  const { ctx } = mockRelevanceCtx([
    { body: { type: "timeout", updates: [], last_message_id: 7 } },
  ]);
  const out = await toolJobPoll.execute({ toolId: "s1", jobId: "j1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.type, "timeout");
  assertEquals(out.updates, []);
});

Deno.test("tool-job-poll: sends no query when no cursor is supplied", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { type: "complete" } }]);
  await toolJobPoll.execute({ toolId: "s1", jobId: "j1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("tool-job-poll: ids are escaped, so a pasted URL cannot break the path", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: {} }]);
  await toolJobPoll.execute({ toolId: "s/1", jobId: "j?1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/latest/studios/s%2F1/async_poll/j%3F1");
});

Deno.test("tool-job-poll: the four documented states are exposed as one string", () => {
  assertEquals(toolJobPoll.type, "read");
  assertEquals(toolJobPoll.params?.map((p) => p.key), [
    "toolId",
    "jobId",
    "afterMessageId",
    "pageSize",
  ]);
  const output = toolJobPoll.output;
  assertEquals(
    Array.isArray(output) ? output.map((o) => o.key) : undefined,
    ["type", "updates", "last_message_id"],
  );
  assert(toolJobPoll.description!.includes("timeout"));
});
