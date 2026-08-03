import { assertEquals, assertRejects } from "@std/assert";
import { API, bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/post-create.ts";

Deno.test("post-create: POSTs /posts with a TipTap document built from plain text", async () => {
  const { ctx, calls } = mockCtx([{ body: { post: { id: 1 } } }]);
  await action.execute({ spaceId: 5, name: "Hello", text: "Body text" }, ctx);
  assertEquals(calls[0].url, `${API}/posts`);
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), {
    space_id: 5,
    name: "Hello",
    // There is no `body` or `body_html` on this endpoint — only `tiptap_body`.
    tiptap_body: {
      body: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Body text" }] }],
      },
    },
  });
});

Deno.test("post-create: a raw TipTap document is passed straight through", async () => {
  const doc = { type: "doc", content: [{ type: "heading", attrs: { level: 2 } }] };
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ spaceId: 5, name: "H", bodyJson: doc }, ctx);
  assertEquals(bodyOf(calls[0]).tiptap_body, { body: doc });
});

Deno.test("post-create: supplying both body forms is rejected before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ spaceId: 1, name: "n", text: "a", bodyJson: {} }, ctx);
    },
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});

Deno.test("post-create: supplying no body at all is rejected", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ spaceId: 1, name: "n" }, ctx);
    },
    Error,
    "body is required",
  );
});

Deno.test("post-create: the author override is sent as user_email, Circle's preferred form", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ spaceId: 5, name: "H", text: "x", authorEmail: "a@b.c" }, ctx);
  assertEquals(bodyOf(calls[0]).user_email, "a@b.c");
});

Deno.test("post-create: topics are sent as an integer array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ spaceId: 5, name: "H", text: "x", topics: "3, 4" }, ctx);
  assertEquals(bodyOf(calls[0]).topics, [3, 4]);
});

Deno.test("post-create: is not idempotent — every call mints a post", () => {
  assertEquals(action.idempotent, false);
});
