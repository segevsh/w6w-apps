import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, bodyOf, mockConnectedCtx, mockCtx, NET } from "../_helpers.ts";
import action from "../../actions/member-tag-add.ts";

const INPUT = { "memberId": 7, "tagId": 5 };

Deno.test("member-tag-add: POST /members/{member_id}/tags on the connected Network", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute(INPUT as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API}/networks/${NET}/members/7/tags`);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  const body = bodyOf(calls[0]);
  assertEquals(body, { "tag_id": 5 });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("member-tag-add: returns the API body", async () => {
  const { ctx } = mockConnectedCtx([{ body: { id: 42, marker: "x" } }]);
  assertEquals(await action.execute(INPUT as never, ctx), { id: 42, marker: "x" });
});

Deno.test("member-tag-add: optional body fields that are unset are not sent", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute({ "memberId": 7, "tagId": 5 } as never, ctx);
  assertEquals(bodyOf(calls[0]), { "tag_id": 5 });
});

Deno.test("member-tag-add: declares what it needs and what it returns", () => {
  assertEquals(action.type, "perform");
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "memberId",
    "tagId",
  ]);
  assertEquals(action.idempotent, true);
  assert(Array.isArray(action.output) && action.output.length > 0);
});

Deno.test("member-tag-add: refuses to run on a connection with no Network ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "Network ID");
  assertEquals(calls.length, 0);
});

Deno.test("member-tag-add: surfaces the vendor error with status and path", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { error: "forbidden", message: "Not allowed" },
  }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "403");
});
