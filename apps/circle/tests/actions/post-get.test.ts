import { assert, assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import action from "../../actions/post-get.ts";

Deno.test("post-get: GETs /posts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 8, name: "Hello" } }]);
  const out = await action.execute({ postId: 8 }, ctx);
  assertEquals(calls[0].url, `${API}/posts/8`);
  assertEquals(out, { id: 8, name: "Hello" });
});

Deno.test("post-get: the TipTap document is returned untouched, so it can be round-tripped", async () => {
  const tiptap = { type: "doc", content: [{ type: "paragraph" }] };
  const { ctx } = mockCtx([{ body: { id: 8, tiptap_body: tiptap, body: { body: "<p></p>" } } }]);
  const out = await action.execute({ postId: 8 }, ctx) as Record<string, unknown>;
  assertEquals(out.tiptap_body, tiptap);
});

Deno.test("post-get: both body shapes are declared on the output", () => {
  const keys = (action.output as Array<{ key: string }>).map((f) => f.key);
  assert(keys.includes("tiptap_body"));
  assert(keys.includes("body"));
});
