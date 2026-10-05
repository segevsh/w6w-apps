import { assertEquals, assertRejects } from "@std/assert";
import recordingDelete from "../../actions/recording-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recording-delete: DELETE /api/v1/recording/r1 on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: "deleted" } }]);
  const out = await recordingDelete.execute({ recordingId: "r1" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/recording/r1");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(calls[0].body, null);
  assertEquals((out as { message: string }).message, "deleted");
});

Deno.test("recording-delete: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () => Promise.resolve(recordingDelete.execute({ recordingId: "r1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
