import { assertEquals, assertRejects } from "@std/assert";
import researchGet from "../../actions/research-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("research-get: 202 in_progress is a successful read, not an error", async () => {
  const body = { request_id: "r 1", status: "in_progress", response_time: 1 };
  const { ctx, calls } = mockCtx([{ status: 202, body }]);
  assertEquals(await researchGet.execute({ requestId: "r 1" }, ctx), body);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/research/r%201");
  assertEquals(calls[0].body, null);
});

Deno.test("research-get: 200 completed returns content and sources", async () => {
  const body = { status: "completed", content: "report", sources: [{ url: "https://s.com" }] };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await researchGet.execute({ requestId: "r1" }, ctx), body);
});

Deno.test("research-get: 404 throws with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Research task not found") }]);
  await assertRejects(
    () => Promise.resolve(researchGet.execute({ requestId: "nope" }, ctx)),
    Error,
    "Research task not found",
  );
});
