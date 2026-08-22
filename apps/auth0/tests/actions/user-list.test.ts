import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("user-list: sends the Lucene query with the v3 search engine", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { users: [{ user_id: "a" }], total: 1 } }],
    conn,
  );
  await action.execute!({ query: 'email:"ada@example.com"' }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("q"), 'email:"ada@example.com"');
  assertEquals(q.get("search_engine"), "v3");
});

/** Auth0 caps a search at 1,000 without saying so. */
Deno.test("user-list: reports the 1,000-result ceiling as a flag and a warning", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { users: [{ user_id: "a" }], total: 4321 },
  }], conn);
  const out = await action.execute!({ limit: 1 }, ctx) as { capped: boolean; total: number };
  assertEquals(out.capped, true);
  assertEquals(out.total, 4321);
  assert(
    logs.some((l) => l.level === "warn" && /1000|1,000/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("user-list: an ordinary result is not flagged as capped", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { users: [{ user_id: "a" }], total: 1 } }], conn);
  const out = await action.execute!({ limit: 10 }, ctx) as { capped: boolean };
  assertEquals(out.capped, false);
});

/** The consistency warning is the reason this action exists in this shape. */
Deno.test("user-list: the description names both silent limits", () => {
  assert(/[Ee]ventually consistent/.test(action.description!), action.description);
  assert(/1,000/.test(action.description!), action.description);
});
