import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-list.ts";

const D = { display: { host: "https://search.internal:8108" } };
const soon = Math.floor(Date.now() / 1000) + 5 * 86_400;
const keys = {
  status: 200,
  body: {
    keys: [
      { id: 1, description: "admin", actions: ["*"], collections: ["*"], value_prefix: "abc" },
      {
        id: 2,
        description: "front end",
        actions: ["documents:search"],
        collections: ["products"],
        value_prefix: "def",
        expires_at: soon,
      },
      {
        id: 3,
        description: "indexer",
        actions: ["documents:*"],
        collections: ["products"],
        value_prefix: "ghi",
      },
    ],
  },
};

/** Only a prefix comes back; the value is shown once at creation. */
Deno.test("key-list: returns prefixes rather than values", async () => {
  const { ctx, calls } = mockCtx([keys], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/keys");
  assertEquals(result.count, 3);
  const serialised = JSON.stringify(result.keys);
  assert(/valuePrefix/.test(serialised), serialised);
  assert(!/"value"/.test(serialised), serialised);
});

/** "A search key in the front end" and "the admin key" look the same outside. */
Deno.test("key-list: flags unrestricted keys and warns", async () => {
  const { ctx, logs } = mockCtx([keys], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.unrestricted, ["admin"]);
  assertEquals(result.searchOnly, ["front end"]);
  assert(
    logs.some((l) => l.level === "warn" && /including dropping them/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("key-list: separates keys expiring soon from those that never expire", async () => {
  const { ctx } = mockCtx([keys], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals((result.expiringSoon as unknown[]).length, 1);
  assertEquals(result.neverExpire, 2);
});

/** Typesense uses a far-future sentinel rather than omitting the field. */
Deno.test("key-list: the sentinel expiry counts as never", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      keys: [{ id: 9, description: "x", actions: [], collections: [], expires_at: 64723363200 }],
    },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.neverExpire, 1);
  assertEquals(result.expiringSoon, []);
});
