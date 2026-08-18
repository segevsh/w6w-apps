import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, gqlError, ok } from "./_shared.ts";
import action from "../../actions/nrql-query.ts";

const rows = (count: number, metadata: Record<string, unknown> = {}) =>
  ok({
    actor: {
      account: {
        nrql: {
          results: Array.from({ length: count }, (_, i) => ({ count: i })),
          metadata: {
            eventTypes: ["Transaction"],
            facets: [],
            messages: [],
            timeWindow: { begin: 1, end: 2 },
            ...metadata,
          },
        },
      },
    },
  });

Deno.test("nrql-query: sends the query and the account as variables", async () => {
  const { ctx, calls } = mockCtx([rows(3)], { display });
  const result = await action.execute!({ query: "SELECT count(*) FROM Transaction" }, ctx) as {
    count: number;
    eventTypes: string[];
  };
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.accountId, 12345);
  assertEquals(body.variables.nrql, "SELECT count(*) FROM Transaction");
  assertEquals(result.count, 3);
  assertEquals(result.eventTypes, ["Transaction"]);
});

Deno.test("nrql-query: an explicit account overrides the connection's", async () => {
  const { ctx, calls } = mockCtx([rows(1)], { display });
  await action.execute!({ query: "SELECT 1", accountId: "999" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.accountId, 999);
});

/** NRQL's silent default limit is 100 — landing exactly on it is the signal. */
Deno.test("nrql-query: landing exactly on a limit is reported as capped", async () => {
  const capped = mockCtx([rows(100)], { display });
  assertEquals(
    (await action.execute!({ query: "SELECT 1" }, capped.ctx) as { capped: boolean }).capped,
    true,
  );

  const under = mockCtx([rows(99)], { display });
  assertEquals(
    (await action.execute!({ query: "SELECT 1" }, under.ctx) as { capped: boolean }).capped,
    false,
  );
});

/** NRQL's warnings — sampling, truncation — live only in metadata.messages. */
Deno.test("nrql-query: NRQL's own messages are surfaced", async () => {
  const { ctx } = mockCtx([rows(3, { messages: ["Data was sampled"] })], { display });
  const result = await action.execute!({ query: "SELECT 1" }, ctx) as { messages: string[] };
  assertEquals(result.messages, ["Data was sampled"]);
});

Deno.test("nrql-query: the time window actually used comes back", async () => {
  const { ctx } = mockCtx([rows(1)], { display });
  const result = await action.execute!({ query: "SELECT 1" }, ctx) as {
    timeWindow: { begin: number };
  };
  assertEquals(result.timeWindow.begin, 1);
});

Deno.test("nrql-query: a timeout is clamped and omitted when unset", async () => {
  const none = mockCtx([rows(1)], { display });
  await action.execute!({ query: "SELECT 1" }, none.ctx);
  assertEquals(JSON.parse(none.calls[0].body!).variables.timeout, null);

  const clamped = mockCtx([rows(1)], { display });
  await action.execute!({ query: "SELECT 1", timeout: 500 }, clamped.ctx);
  assertEquals(JSON.parse(clamped.calls[0].body!).variables.timeout, 120);
});

/** A bad NRQL string comes back as HTTP 200 with errors. */
Deno.test("nrql-query: a syntax error inside a 200 throws", async () => {
  const { ctx } = mockCtx([gqlError("NRQL Syntax Error: unexpected 'FRM'")], { display });
  await assertRejects(
    async () => await action.execute!({ query: "SELECT 1 FRM Transaction" }, ctx),
    Error,
    "NRQL Syntax Error",
  );
});

Deno.test("nrql-query: needs a query", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`query` is required");
  assertEquals(calls.length, 0);
});

/** No default account and none given is an explanatory failure, not a 400. */
Deno.test("nrql-query: no account anywhere explains why it is needed", async () => {
  const { ctx } = mockCtx([], { display: { region: "US" } });
  await assertRejects(
    async () => await action.execute!({ query: "SELECT 1" }, ctx),
    Error,
    "several accounts",
  );
});

/** The query is the caller's. */
Deno.test("nrql-query: logs counts, never the query or the rows", async () => {
  const { ctx, logs } = mockCtx([rows(3)], { display });
  await action.execute!({ query: "SELECT * FROM SecretEvent" }, ctx);
  assert(!JSON.stringify(logs).includes("SecretEvent"), JSON.stringify(logs));
  assertEquals(logs[0].data, { accountId: 12345, count: 3, capped: false, messages: 0 });
});

Deno.test("nrql-query: names the two silent defaults", () => {
  assert(/last\s+HOUR/.test(action.description!), action.description);
  assert(/first 100 rows/.test(action.description!), action.description);
});
