import { assertEquals } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete.ts";

Deno.test("document-delete: DELETEs the path, preconditioned on existence by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: DISPLAY });

  const result = await action.execute({ path: "users/alice" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents/users/alice",
  );
  assertEquals(new URL(calls[0].url).searchParams.get("currentDocument.exists"), "true");
  assertEquals(result, {
    deleted: true,
    name: "projects/p1/databases/(default)/documents/users/alice",
  });
});

Deno.test("document-delete: 'missing' can be required instead, and '' means no precondition", async () => {
  const missing = mockCtx([{ status: 200, body: {} }], { display: DISPLAY });
  await action.execute({ path: "users/alice", exists: "missing" }, missing.ctx);
  assertEquals(new URL(missing.calls[0].url).searchParams.get("currentDocument.exists"), "false");

  const none = mockCtx([{ status: 200, body: {} }], { display: DISPLAY });
  await action.execute({ path: "users/alice", exists: "" }, none.ctx);
  assertEquals(new URL(none.calls[0].url).searchParams.has("currentDocument.exists"), false);
});

Deno.test("document-delete: an empty 204 body is still a success", async () => {
  const { ctx } = mockCtx([{ status: 204 }], { display: DISPLAY });
  const result = await action.execute({ path: "users/alice" }, ctx) as { deleted?: boolean };
  assertEquals(result.deleted, true);
});
