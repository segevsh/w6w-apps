import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, mockConnectedCtx, mockCtx, NET } from "../_helpers.ts";
import action from "../../actions/member-tag-remove.ts";

const INPUT = { "memberId": 7, "tagId": 7 };

Deno.test("member-tag-remove: DELETE /members/{member_id}/tags/{tag_id}/ on the connected Network", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: {} }]);
  await action.execute(INPUT as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API}/networks/${NET}/members/7/tags/7/`);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.search, "");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("member-tag-remove: reports success even for an empty / 204 response", async () => {
  const { ctx } = mockConnectedCtx([{ status: 204 }]);
  assertEquals(await action.execute(INPUT as never, ctx), { success: true });
});

Deno.test("member-tag-remove: declares what it needs and what it returns", () => {
  assertEquals(action.type, "perform");
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "memberId",
    "tagId",
  ]);
  assertEquals(action.idempotent, true);
  assert(Array.isArray(action.output) && action.output.length > 0);
});

Deno.test("member-tag-remove: refuses to run on a connection with no Network ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "Network ID");
  assertEquals(calls.length, 0);
});

Deno.test("member-tag-remove: surfaces the vendor error with status and path", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { error: "forbidden", message: "Not allowed" },
  }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "403");
});
