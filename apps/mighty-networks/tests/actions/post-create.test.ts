import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, bodyOf, mockConnectedCtx, mockCtx, NET, queryOf } from "../_helpers.ts";
import action from "../../actions/post-create.ts";

const INPUT = {
  "spaceId": 3,
  "title": "Hello",
  "description": "First post",
  "postType": "article",
  "notify": true,
};

Deno.test("post-create: POST /posts on the connected Network", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute(INPUT as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API}/networks/${NET}/posts`);
  assertEquals(calls[0].method, "POST");
  const q = queryOf(calls[0]);
  assertEquals(q["notify"], "true");
  const body = bodyOf(calls[0]);
  assertEquals(body, {
    "space_id": 3,
    "title": "Hello",
    "description": "First post",
    "post_type": "article",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("post-create: returns the API body", async () => {
  const { ctx } = mockConnectedCtx([{ body: { id: 42, marker: "x" } }]);
  assertEquals(await action.execute(INPUT as never, ctx), { id: 42, marker: "x" });
});

Deno.test("post-create: optional body fields that are unset are not sent", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute({ "spaceId": 3, "title": "Hello" } as never, ctx);
  assertEquals(bodyOf(calls[0]), { "space_id": 3, "title": "Hello" });
});

Deno.test("post-create: declares what it needs and what it returns", () => {
  assertEquals(action.type, "perform");
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "spaceId",
    "title",
  ]);
  assertEquals(action.idempotent, false);
  assert(Array.isArray(action.output) && action.output.length > 0);
});

Deno.test("post-create: refuses to run on a connection with no Network ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "Network ID");
  assertEquals(calls.length, 0);
});

Deno.test("post-create: surfaces the vendor error with status and path", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { error: "forbidden", message: "Not allowed" },
  }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "403");
});
