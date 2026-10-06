import { assertEquals, assertRejects } from "@std/assert";
import set from "../../actions/stream-preferences-set.ts";
import { mockCtx, pathOf, queryOf, text } from "../_helpers.ts";

Deno.test("stream-preferences-set: POSTs s, k=subscription-ordering and v", async () => {
  const { ctx, calls } = mockCtx([text("OK")]);
  const out = await set.execute({
    streamId: "user/-/label/MIT",
    value: "00005C9F0000425D",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/reader/api/0/preference/stream/set");
  assertEquals(queryOf(calls[0].url), {
    s: "user/-/label/MIT",
    k: "subscription-ordering",
    v: "00005C9F0000425D",
  });
  assertEquals(out, { ok: true });
});

Deno.test("stream-preferences-set: rejects malformed ordering and an empty stream", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await set.execute({ streamId: "s", value: "XYZ" }, ctx),
    Error,
    "8-character",
  );
  await assertRejects(
    async () => await set.execute({ streamId: "s", value: "0000AB" }, ctx),
    Error,
    "8-character",
  );
  await assertRejects(
    async () => await set.execute({ streamId: "", value: "00005C9F" }, ctx),
    Error,
    "streamId",
  );
  assertEquals(calls.length, 0);
});
