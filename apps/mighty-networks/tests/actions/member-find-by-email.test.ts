import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, mockConnectedCtx, mockCtx, NET, queryOf } from "../_helpers.ts";
import action from "../../actions/member-find-by-email.ts";

const INPUT = { "email": "ada@example.com" };

Deno.test("member-find-by-email: GET /members/by_email on the connected Network", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute(INPUT as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API}/networks/${NET}/members/by_email`);
  assertEquals(calls[0].method, "GET");
  const q = queryOf(calls[0]);
  assertEquals(q["email"], "ada@example.com");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("member-find-by-email: returns the API body", async () => {
  const { ctx } = mockConnectedCtx([{ body: { id: 42, marker: "x" } }]);
  assertEquals(await action.execute(INPUT as never, ctx), { id: 42, marker: "x" });
});

Deno.test("member-find-by-email: declares what it needs and what it returns", () => {
  assertEquals(action.type, "read");
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), ["email"]);
  assert(Array.isArray(action.output) && action.output.length > 0);
});

Deno.test("member-find-by-email: refuses to run on a connection with no Network ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "Network ID");
  assertEquals(calls.length, 0);
});

Deno.test("member-find-by-email: surfaces the vendor error with status and path", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { error: "forbidden", message: "Not allowed" },
  }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "403");
});
