import { assert, assertEquals } from "@std/assert";
import action from "../../actions/note-comment-create.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-comment-create: POSTs the comment content", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "c-1" }) }]);
  const out = await action.execute({ noteId: "n-1", content: "Following up" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/notes/n-1/comments");
  assertEquals(bodyOf(calls[0]), { data: { content: "Following up" } });
  assertEquals(out.data, { id: "c-1" });
});

Deno.test("note-comment-create: the vendor's 1-7000 length bound is declared on the param", () => {
  const p = action.params?.find((p) => p.key === "content");
  assertEquals(p?.required, true);
  assertEquals(p?.validation?.minLength, 1);
  assertEquals(p?.validation?.maxLength, 7000);
});

Deno.test("note-comment-create: says it is write-only, since v2 offers no way to read comments", () => {
  assert(action.description!.toLowerCase().includes("write-only"), action.description!);
  assertEquals(action.idempotent, false);
});
