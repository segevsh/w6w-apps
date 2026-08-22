import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-search.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const PREFIX = ")]}'\n";
const accounts = (list: unknown[]) => ({ status: 200, body: PREFIX + JSON.stringify(list) });

Deno.test("account-search: resolves people to ids Gerrit accepts", async () => {
  const { ctx, calls } = mockCtx([
    accounts([{ _account_id: 1000, name: "Ada", username: "ada", email: "ada@example.com" }]),
  ], D);
  const result = await action.execute({ q: "ada@example.com" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("q"), "ada@example.com");
  assertEquals(result.ids, [1000]);
  assertEquals(result.usernames, ["ada"]);
  assertEquals((result.exactMatch as { username: string }).username, "ada");
});

/** An inactive account resolves and cannot be added as a reviewer. */
Deno.test("account-search: excludes inactive accounts by default and counts them", async () => {
  const { ctx } = mockCtx([
    accounts([
      { _account_id: 1000, username: "ada" },
      { _account_id: 1001, username: "gone", inactive: true },
    ]),
  ], D);
  const result = await action.execute({ q: "is:active" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 1);
  assertEquals(result.inactiveCount, 1);
  assertEquals(result.exactMatch !== undefined, true);
});

Deno.test("account-search: includeInactive returns them", async () => {
  const { ctx } = mockCtx([
    accounts([{ _account_id: 1001, username: "gone", inactive: true }]),
  ], D);
  const result = await action.execute({ q: "gone", includeInactive: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.count, 1);
});

/** An empty result may be visibility policy rather than a missing person. */
Deno.test("account-search: says an empty result is ambiguous", async () => {
  const { ctx, logs } = mockCtx([accounts([])], D);
  const result = await action.execute({ q: "nobody@example.com" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assert(
    logs.some((l) => /account visibility is a server setting/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("account-search: asks for details and requires a query", async () => {
  const { ctx, calls } = mockCtx([accounts([])], D);
  await action.execute({ q: "ada" }, ctx);
  assert(new URL(calls[0].url).searchParams.getAll("o").includes("DETAILS"));
  await assertRejects(async () => await action.execute({ q: "" }, ctx), Error, "`q` is required");
});
