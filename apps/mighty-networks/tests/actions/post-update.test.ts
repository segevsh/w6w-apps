import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, bodyOf, mockConnectedCtx, mockCtx, NET, queryOf } from "../_helpers.ts";
import action from "../../actions/post-update.ts";

const INPUT = { "id": 7, "title": "New title", "description": "New body", "notify": false };

Deno.test("post-update: PATCH /posts/{id}/ on the connected Network", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute(INPUT as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API}/networks/${NET}/posts/7/`);
  assertEquals(calls[0].method, "PATCH");
  const q = queryOf(calls[0]);
  assertEquals(q["notify"], "false");
  const body = bodyOf(calls[0]);
  assertEquals(body, { "title": "New title", "description": "New body" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("post-update: returns the API body", async () => {
  const { ctx } = mockConnectedCtx([{ body: { id: 42, marker: "x" } }]);
  assertEquals(await action.execute(INPUT as never, ctx), { id: 42, marker: "x" });
});

Deno.test("post-update: optional body fields that are unset are not sent", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute({ "id": 7 } as never, ctx);
  assertEquals(calls[0].body, "{}");
});

Deno.test("post-update: declares what it needs and what it returns", () => {
  assertEquals(action.type, "perform");
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), ["id"]);
  assertEquals(action.idempotent, true);
  assert(Array.isArray(action.output) && action.output.length > 0);
});

Deno.test("post-update: refuses to run on a connection with no Network ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "Network ID");
  assertEquals(calls.length, 0);
});

Deno.test("post-update: surfaces the vendor error with status and path", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { error: "forbidden", message: "Not allowed" },
  }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "403");
});
