import { assertEquals } from "@std/assert";
import action from "../../actions/remove-tag-from-subscriber.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("remove-tag-from-subscriber: DELETEs /v4/tags/{tag_id}/subscribers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ tagId: 284, subscriberId: 1276 }, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/tags/284/subscribers/1276");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
});

Deno.test("remove-tag-from-subscriber: resolves undefined on Kit's 204", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ tagId: 284, subscriberId: 1276 }, ctx), undefined);
});

Deno.test("remove-tag-from-subscriber: declares no output — the endpoint returns no content", () => {
  assertEquals(action.output, []);
  assertEquals(action.idempotent, true);
});
