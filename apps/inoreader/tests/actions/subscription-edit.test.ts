import { assertEquals, assertRejects } from "@std/assert";
import edit from "../../actions/subscription-edit.ts";
import { mockCtx, pathOf, queryOf, text } from "../_helpers.ts";

Deno.test("subscription-edit: POSTs ac/s/t/a/r and returns ok", async () => {
  const { ctx, calls } = mockCtx([text("OK")]);
  const out = await edit.execute({
    action: "edit",
    streamId: "feed/http://x/rss",
    title: " New ",
    addToFolder: "user/-/label/Tech",
    removeFromFolder: "user/-/label/Old",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/reader/api/0/subscription/edit");
  assertEquals(queryOf(calls[0].url), {
    ac: "edit",
    s: "feed/http://x/rss",
    t: "New",
    a: "user/-/label/Tech",
    r: "user/-/label/Old",
  });
  assertEquals(out, { ok: true });
});

Deno.test("subscription-edit: omits unset title/folders (title omitted keeps the title)", async () => {
  const { ctx, calls } = mockCtx([text("OK")]);
  await edit.execute({ action: "unsubscribe", streamId: "feed/x" }, ctx);
  assertEquals(queryOf(calls[0].url), { ac: "unsubscribe", s: "feed/x" });
});

Deno.test("subscription-edit: validates action and streamId; a non-OK body fails", async () => {
  const { ctx } = mockCtx([text("Error=Unknown feed", 200)]);
  await assertRejects(
    async () => await edit.execute({ action: "bogus" as "edit", streamId: "x" }, ctx),
    Error,
    "action must be",
  );
  await assertRejects(
    async () => await edit.execute({ action: "edit", streamId: " " }, ctx),
    Error,
    "required",
  );
  await assertRejects(
    async () => await edit.execute({ action: "edit", streamId: "feed/x" }, ctx),
    Error,
    "Unknown feed",
  );
});
