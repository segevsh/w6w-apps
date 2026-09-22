import { assertEquals } from "@std/assert";
import action from "../../actions/delete-tag.ts";
import { API_ROOT, mockCtx, urlOf } from "../_helpers.ts";

Deno.test("delete-tag: DELETEs /tags/{tagId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute({ tagId: "tag-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/tags/tag-1`);
  assertEquals(result, { status: 200 });
});

Deno.test("delete-tag: an error status is surfaced rather than swallowed", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  let message = "";
  try {
    await action.execute({ tagId: "gone" }, ctx);
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  assertEquals(message.includes("HTTP 404"), true, message);
});

Deno.test("delete-tag: declared idempotent", () => {
  assertEquals(action.idempotent, true);
  assertEquals(action.resource, "tag");
});
