import { assertEquals, assertRejects } from "@std/assert";
import recordingGet from "../../actions/recording-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recording-get: GET /api/v1/recording/r%2F1 on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { recording: { id: "r/1", title: "Standup" } },
  }]);
  const out = await recordingGet.execute({ recordingId: "r/1" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/recording/r%2F1");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(calls[0].body, null);
  assertEquals((out as { id: string }).id, "r/1");
});

Deno.test("recording-get: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () => Promise.resolve(recordingGet.execute({ recordingId: "r/1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
