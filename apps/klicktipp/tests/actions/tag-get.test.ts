import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-get.ts";

Deno.test("tag-get: GETs the tag", async () => {
  const { ctx, calls } = mockCtx([{ body: { tagid: "21", name: "mytag", text: "some text" } }]);
  const out = await action.execute({ tagId: 21 }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/tag/21");
  assertEquals(out, { tagId: "21", name: "mytag", text: "some text" });
});

Deno.test("tag-get: 404 is reported", async () => {
  const { ctx } = mockCtx([{ status: 404, body: ["There is no such entity."] }]);
  await assertRejects(async () => await action.execute({ tagId: 1 }, ctx), Error, "no such entity");
});
