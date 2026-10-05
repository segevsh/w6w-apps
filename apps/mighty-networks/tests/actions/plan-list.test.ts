import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, mockConnectedCtx, mockCtx, NET, queryOf } from "../_helpers.ts";
import action from "../../actions/plan-list.ts";

const INPUT = { "page": 2, "perPage": 50 };

Deno.test("plan-list: GET /plans on the connected Network", async () => {
  const { ctx, calls } = mockConnectedCtx([{
    body: { items: [{ id: 1 }], meta: { current_page: 1 } },
  }]);
  await action.execute(INPUT as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API}/networks/${NET}/plans`);
  assertEquals(calls[0].method, "GET");
  const q = queryOf(calls[0]);
  assertEquals(q["page"], "2");
  assertEquals(q["per_page"], "50");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("plan-list: lifts items out of the page and keeps the whole body", async () => {
  const { ctx } = mockConnectedCtx([{ body: { items: [{ id: 1 }], links: {} } }]);
  const out = await action.execute(INPUT as never, ctx) as {
    items: unknown[] | null;
    result: unknown;
  };
  assertEquals(out.items, [{ id: 1 }]);
  assertEquals(out.result, { items: [{ id: 1 }], links: {} });
});

Deno.test("plan-list: items is null when the body has no array", async () => {
  const { ctx } = mockConnectedCtx([{ body: { weird: true } }]);
  const out = await action.execute(INPUT as never, ctx) as { items: unknown[] | null };
  assertEquals(out.items, null);
});

Deno.test("plan-list: declares what it needs and what it returns", () => {
  assertEquals(action.type, "search");
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assert(Array.isArray(action.output) && action.output.length > 0);
});

Deno.test("plan-list: refuses to run on a connection with no Network ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "Network ID");
  assertEquals(calls.length, 0);
});

Deno.test("plan-list: surfaces the vendor error with status and path", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { error: "forbidden", message: "Not allowed" },
  }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "403");
});
