import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-list.ts";

const display = { projectId: "proj_1" };
const keys = (list: unknown[]) => ({ status: 200, body: { api_keys: list } });

/**
 * A key with no expiry lives forever, and a key quietly given `owner` is the
 * finding an access review is looking for.
 */
Deno.test("key-list: separates the keys with no expiry and the privileged ones", async () => {
  const { ctx, calls } = mockCtx([keys([
    {
      api_key: {
        api_key_id: "k1",
        comment: "ci",
        scopes: ["member"],
        expiration_date: "2027-01-01",
      },
    },
    { api_key: { api_key_id: "k2", comment: "old-import", scopes: ["owner"] } },
  ])], { display });
  const result = await action.execute!({}, ctx) as {
    count: number;
    neverExpire: string[];
    privileged: string[];
  };
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects/proj_1/keys");
  assertEquals(result.count, 2);
  assertEquals(result.neverExpire, ["old-import"]);
  assertEquals(result.privileged, ["old-import"]);
});

Deno.test("key-list: an unnamed key falls back to its id, not to nothing", async () => {
  const { ctx } = mockCtx([keys([{ api_key: { api_key_id: "k3", scopes: ["member"] } }])], {
    display,
  });
  const result = await action.execute!({}, ctx) as { neverExpire: string[] };
  assertEquals(result.neverExpire, ["k3"]);
});

/** Deepgram shows a key once at creation, so listing them leaks nothing. */
Deno.test("key-list: says the values are never returned", () => {
  assert(/never returned/.test(action.description!), action.description);
});
