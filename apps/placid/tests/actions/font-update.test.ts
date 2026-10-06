import { assertEquals } from "@std/assert";
import fontUpdate from "../../actions/font-update.ts";
import { assertRejects, mockCtx } from "../_helpers.ts";

const FONT = { uuid: "f1", title: "H", filename: "h.ttf", created_at: "2026-05-06T11:24:00+00:00" };

Deno.test("font-update: PATCH with only the title", async () => {
  const { ctx, calls } = mockCtx([{ body: FONT }]);
  await fontUpdate.execute({ uuid: "f1", title: "New" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { title: "New" });
  await assertRejects(() => fontUpdate.execute({ uuid: "f1", title: "" }, mockCtx().ctx));
});
