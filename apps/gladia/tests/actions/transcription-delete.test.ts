import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transcription-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transcription-delete: DELETEs the job; an empty 202 yields deleted:true", async () => {
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  const out = await action.execute({ transcriptionId: "j1" }, ctx);
  assertEquals(out, { deleted: true, id: "j1" });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/pre-recorded/j1");
});

Deno.test("transcription-delete: 403 (not deletable) and 404 throw", async () => {
  const forbidden = mockCtx([{ status: 403, body: errorBody(403, "not deletable") }]).ctx;
  await assertRejects(
    async () => await action.execute({ transcriptionId: "j" }, forbidden),
    Error,
    "not deletable",
  );
  const missing = mockCtx([{ status: 404, body: errorBody(404, "gone") }]).ctx;
  await assertRejects(
    async () => await action.execute({ transcriptionId: "j" }, missing),
    Error,
    "404",
  );
});

Deno.test("transcription-delete: declared non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
