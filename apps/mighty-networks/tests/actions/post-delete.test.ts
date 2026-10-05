import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, mockConnectedCtx, mockCtx, NET } from "../_helpers.ts";
import action from "../../actions/post-delete.ts";

const INPUT = { "id": 7 };

Deno.test("post-delete: DELETE /posts/{id}/ on the connected Network", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: {} }]);
  await action.execute(INPUT as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API}/networks/${NET}/posts/7/`);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.search, "");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("post-delete: reports success even for an empty / 204 response", async () => {
  const { ctx } = mockConnectedCtx([{ status: 204 }]);
  assertEquals(await action.execute(INPUT as never, ctx), { success: true });
});

Deno.test("post-delete: declares what it needs and what it returns", () => {
  assertEquals(action.type, "perform");
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), ["id"]);
  assertEquals(action.idempotent, true);
  assert(Array.isArray(action.output) && action.output.length > 0);
});

Deno.test("post-delete: refuses to run on a connection with no Network ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "Network ID");
  assertEquals(calls.length, 0);
});

Deno.test("post-delete: surfaces the vendor error with status and path", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { error: "forbidden", message: "Not allowed" },
  }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "403");
});
