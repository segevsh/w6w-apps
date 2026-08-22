import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/price-get-many.ts";

Deno.test("price-get-many: a product id becomes ?product= and defaults to active only", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  await action.execute({ productId: "prod_1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/prices");
  assertEquals(url.searchParams.get("product"), "prod_1");
  assertEquals(url.searchParams.get("active"), "true");
});

Deno.test("price-get-many: active:false is honoured, not overridden by the default", async () => {
  // A falsy-default bug (`input.active ?? true`) reads false as absent and
  // would silently hide the inactive prices the caller explicitly asked for.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ productId: "prod_1", active: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("active"), "false");
});

Deno.test("price-get-many: lookup keys split on commas and trim surrounding space", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ lookupKeys: " team_monthly ,team_annual " }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("lookup_keys[0]"), "team_monthly");
  assertEquals(q.get("lookup_keys[1]"), "team_annual");
});

Deno.test("price-get-many: a blank lookup-keys field is omitted, never sent empty", async () => {
  // "" would otherwise become lookup_keys[0]= and match nothing at all,
  // turning a blank optional filter into a guaranteed empty result.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ productId: "prod_1", lookupKeys: "  " }, ctx);
  const raw = calls[0].url;
  assert(!raw.includes("lookup_keys"), `lookup_keys must be absent, got ${raw}`);
});

Deno.test("price-get-many: empty select/currency filters are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ productId: "prod_1", type: "", currency: "" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("type"), null);
  assertEquals(q.get("currency"), null);
});

Deno.test("price-get-many: is a read — it must not carry an idempotency key", () => {
  assert(!action.idempotent, "a search action must not be marked idempotent-write");
  assertEquals(action.type, "search");
});
