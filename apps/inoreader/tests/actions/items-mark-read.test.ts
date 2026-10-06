import { assertEquals, assertRejects } from "@std/assert";
import markRead from "../../actions/items-mark-read.ts";
import { mockCtx, queryAll, queryOf, text } from "../_helpers.ts";

Deno.test("items-mark-read: default adds the read tag", async () => {
  const { ctx, calls } = mockCtx([text("OK")]);
  const out = await markRead.execute({ itemIds: "1,2" }, ctx);
  assertEquals(queryOf(calls[0].url).a, "user/-/state/com.google/read");
  assertEquals(queryOf(calls[0].url).r, undefined);
  assertEquals(queryAll(calls[0].url, "i"), ["1", "2"]);
  assertEquals(out, { ok: true, itemCount: 2 });
});

Deno.test("items-mark-read: read=false removes the read tag", async () => {
  const { ctx, calls } = mockCtx([text("OK")]);
  await markRead.execute({ itemIds: "1", read: false }, ctx);
  assertEquals(queryOf(calls[0].url).r, "user/-/state/com.google/read");
  assertEquals(queryOf(calls[0].url).a, undefined);
});

Deno.test("items-mark-read: empty and oversize id lists are rejected", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await markRead.execute({ itemIds: "" }, ctx),
    Error,
    "at least one",
  );
  const many = Array.from({ length: 101 }, (_, i) => String(i)).join(",");
  await assertRejects(
    async () => await markRead.execute({ itemIds: many }, ctx),
    Error,
    "at most 100",
  );
});
