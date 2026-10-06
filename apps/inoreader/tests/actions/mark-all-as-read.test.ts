import { assertEquals, assertRejects } from "@std/assert";
import markAll from "../../actions/mark-all-as-read.ts";
import { mockCtx, pathOf, queryOf, text } from "../_helpers.ts";

Deno.test("mark-all-as-read: POSTs s and ts", async () => {
  const { ctx, calls } = mockCtx([text("OK")]);
  const out = await markAll.execute(
    { streamId: "user/-/label/Tech", timestamp: 1700000000.9 },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/reader/api/0/mark-all-as-read");
  assertEquals(queryOf(calls[0].url), { s: "user/-/label/Tech", ts: "1700000000" });
  assertEquals(out, { ok: true });
});

Deno.test("mark-all-as-read: requires a stream and a positive timestamp", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await markAll.execute({ streamId: "", timestamp: 1 }, ctx),
    Error,
    "streamId",
  );
  await assertRejects(
    async () => await markAll.execute({ streamId: "s", timestamp: 0 }, ctx),
    Error,
    "timestamp",
  );
  await assertRejects(
    async () =>
      await markAll.execute(
        { streamId: "s" } as unknown as { streamId: string; timestamp: number },
        ctx,
      ),
    Error,
    "timestamp",
  );
  assertEquals(calls.length, 0);
});
