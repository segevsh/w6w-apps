import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ok } from "./_shared.ts";
import action from "../../actions/connection-resync.ts";

/**
 * Fivetran bills by monthly active rows, so a full re-sync re-bills every row —
 * real money that arrives on next month's invoice rather than as an error.
 */
Deno.test("connection-resync: refuses without the acknowledgement, and says why", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ connectionId: "c1" }, ctx),
    Error,
    "monthly active rows",
  );
  assertEquals(calls.length, 0);
});

Deno.test("connection-resync: acknowledged, it posts and warns", async () => {
  const { ctx, calls, logs } = mockCtx([ok({})]);
  const result = await action.execute!({ connectionId: "c1", confirm: true }, ctx) as {
    queued: boolean;
    scoped: boolean;
  };
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/connections/c1/resync");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(result.queued, true);
  assertEquals(result.scoped, false);
  assert(logs.some((l) => l.level === "warn" && /re-billed/.test(l.message)), JSON.stringify(logs));
});

/** Scoping costs proportionally less and is usually what the reason calls for. */
Deno.test("connection-resync: a scope limits it to named tables", async () => {
  const { ctx, calls } = mockCtx([ok({})]);
  const result = await action.execute!({
    connectionId: "c1",
    confirm: true,
    scope: '{"public":["orders","customers"]}',
  }, ctx) as { scoped: boolean };
  assertEquals(JSON.parse(calls[0].body!), { scope: { public: ["orders", "customers"] } });
  assertEquals(result.scoped, true);
});

/** Fivetran answers 400 for an empty scope; refusing here says why. */
Deno.test("connection-resync: an empty scope is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ connectionId: "c1", confirm: true, scope: "{}" }, ctx),
    Error,
    "rejected rather than meaning everything",
  );
  assertEquals(calls.length, 0);
});

Deno.test("connection-resync: malformed scope JSON is refused by name", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ connectionId: "c1", confirm: true, scope: "{oops" }, ctx),
    Error,
    "scope",
  );
});

Deno.test("connection-resync: needs a connection id", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ confirm: true }, ctx),
    Error,
    "connectionId",
  );
});

Deno.test("connection-resync: states the cost in its description", () => {
  assert(/re-bills every row/.test(action.description!), action.description);
});
