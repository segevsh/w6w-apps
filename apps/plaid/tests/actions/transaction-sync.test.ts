import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transaction-sync.ts";

const conn = { display: { environment: "sandbox" } };

Deno.test("transaction-sync: returns added, modified and removed separately", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      added: [{ transaction_id: "t1" }],
      modified: [{ transaction_id: "t2" }],
      removed: [{ transaction_id: "t3" }],
      next_cursor: "cur2",
      has_more: false,
    },
  }], conn);
  const out = await action.execute!({ accessToken: "tok", cursor: "cur1" }, ctx) as {
    added: unknown[];
    modified: unknown[];
    removed: unknown[];
    nextCursor: string;
  };
  assertEquals(out.added.length, 1);
  assertEquals(out.modified.length, 1);
  assertEquals(out.removed.length, 1);
  assertEquals(out.nextCursor, "cur2");
  assertEquals(new URL(calls[0].url).pathname, "/transactions/sync");
  assertEquals(JSON.parse(calls[0].body!).cursor, "cur1");
});

/** The first sync of an Item is many pages. */
Deno.test("transaction-sync: follows has_more, carrying the cursor", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { added: [{ id: 1 }], next_cursor: "c2", has_more: true } },
    { status: 200, body: { added: [{ id: 2 }], next_cursor: "c3", has_more: false } },
  ], conn);
  const out = await action.execute!({ accessToken: "tok" }, ctx) as {
    added: unknown[];
    nextCursor: string;
    hasMore: boolean;
  };
  assertEquals(out.added.length, 2);
  assertEquals(out.nextCursor, "c3");
  assertEquals(out.hasMore, false);
  assertEquals(JSON.parse(calls[1].body!).cursor, "c2");
});

/** Hitting the ceiling is not a failure — it means run again. */
Deno.test("transaction-sync: the page ceiling stops the loop and says so", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { added: [], next_cursor: "c2", has_more: true } },
    { status: 200, body: { added: [], next_cursor: "c3", has_more: true } },
  ], conn);
  const out = await action.execute!({ accessToken: "tok", maxPages: 2 }, ctx) as {
    hasMore: boolean;
    nextCursor: string;
  };
  assertEquals(calls.length, 2);
  assertEquals(out.hasMore, true);
  assertEquals(out.nextCursor, "c3");
});

Deno.test("transaction-sync: the page size is capped at Plaid's maximum", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { has_more: false } }], conn);
  await action.execute!({ accessToken: "tok", count: 5000 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).count, 500);
});

Deno.test("transaction-sync: a missing access token is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "accessToken");
  assertEquals(calls.length, 0);
});

/** The access token is a per-person secret, not a connection field. */
Deno.test("transaction-sync: the access token is declared secret", () => {
  const p = (action.params as Array<{ key: string; type: string }>)
    .find((p) => p.key === "accessToken")!;
  assertEquals(p.type, "secret");
});
