import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-list.ts";

Deno.test("tag-list: reshapes the id-to-name map", async () => {
  const { ctx, calls } = mockCtx([{ body: { "21": "mytag", "23": "example" } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.klicktipp.com/tag");
  assertEquals(out, { tags: [{ id: "21", name: "mytag" }, { id: "23", name: "example" }] });
  assertEquals(action.params ?? [], []);
});

Deno.test("tag-list: 403 is an error, not an empty list", async () => {
  const { ctx } = mockCtx([{ status: 403, body: ["API access denied."] }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "API access denied.");
});
