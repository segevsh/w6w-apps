import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-accounts.ts";

const ok = { status: 200, body: { object: "list", has_more: false, next: null, data: [] } };

Deno.test("list-accounts: is a search action over the account resource", () => {
  assertEquals(action.key, "list-accounts");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "account");
});

Deno.test("list-accounts: GETs /accounts on the connection's own host", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({}, connected(ctx));
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://v3.recurly.com");
  assertEquals(url.pathname, "/accounts");
  assertEquals(url.search, "");
});

Deno.test("list-accounts: sends filters as documented query params", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    limit: 25,
    order: "desc",
    sort: "updated_at",
    email: "a@b.com",
    subscriber: true,
    pastDue: true,
  }, connected(ctx));
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("limit"), "25");
  assertEquals(q.get("order"), "desc");
  assertEquals(q.get("sort"), "updated_at");
  assertEquals(q.get("email"), "a@b.com");
  assertEquals(q.get("subscriber"), "true");
  assertEquals(q.get("past_due"), "true");
});

Deno.test("list-accounts: pastDue=false sends nothing — Recurly has no such literal", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ pastDue: false }, connected(ctx));
  assertEquals(new URL(calls[0].url).searchParams.get("past_due"), null);
});

Deno.test("list-accounts: a `next` value is fetched verbatim, ignoring every other param", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute(
    { next: "/accounts?cursor=abc123&limit=20", limit: 5, email: "x@y.com" },
    connected(ctx),
  );
  assertEquals(calls[0].url, "https://v3.recurly.com/accounts?cursor=abc123&limit=20");
});

Deno.test("list-accounts: returns Recurly's list envelope unchanged", async () => {
  const body = { object: "list", has_more: true, next: "/accounts?cursor=x", data: [{ id: "a1" }] };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute({}, connected(ctx)), body);
});
