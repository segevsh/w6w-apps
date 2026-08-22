import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/user-key.ts";
import { REGIONS } from "../../lib/client.ts";

const cred = { apiKey: "NRAK-TESTKEY", region: "US" };
const user = { status: 200, body: { data: { actor: { user: { name: "Ada", email: "a@b.c" } } } } };

Deno.test("user-key: signs into New Relic's own header, not Authorization", () => {
  const request = { url: REGIONS.US, headers: {} as Record<string, string> };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["api-key"], "NRAK-TESTKEY");
  assertEquals(signed.headers["authorization"], undefined);
  assertEquals(auth.apiKey, { in: "header", name: "API-Key" });
});

Deno.test("user-key: the test runs the smallest query there is", async () => {
  const { ctx, calls } = mockCtx([user]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, REGIONS.US);
  assertEquals(JSON.parse(calls[0].body!).query, "{ actor { user { name email } } }");
  assertEquals(result.ok, true);
  assert(/Ada/.test(result.message!), result.message);
});

/**
 * A License or Ingest key against NerdGraph returns the same message a wrong
 * key does, so the shape is worth checking before spending a request.
 */
Deno.test("user-key: a key that is not NRAK- is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({
    credential: { apiKey: "1234567890abcdef1234567890abcdefNRAL", region: "US" },
  } as never, ctx);
  assertEquals(result.ok, false);
  assert(/begin `NRAK-`/.test(result.message!), result.message);
  assert(/cannot query NerdGraph/.test(result.message!), result.message);
  assertEquals(calls.length, 0);
});

/** The wrong region fails identically to a wrong key. */
Deno.test("user-key: a failure suggests the other region", async () => {
  const us = mockCtx([{ status: 401, body: { errors: [{ message: "authentication required" }] } }]);
  const usResult = await auth.test!({ credential: cred } as never, us.ctx);
  assertEquals(usResult.ok, false);
  assert(/try the EU region/.test(usResult.message!), usResult.message);

  const eu = mockCtx([{ status: 401, body: { errors: [{ message: "authentication required" }] } }]);
  const euResult = await auth.test!({
    credential: { ...cred, region: "EU" },
  } as never, eu.ctx);
  assert(/try the US region/.test(euResult.message!), euResult.message);
  assertEquals(eu.calls[0].url, REGIONS.EU);
});

/** GraphQL errors arrive in a 200, and the test must not read that as success. */
Deno.test("user-key: errors inside a 200 fail the test", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { errors: [{ message: "authentication required" }] },
  }]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, false);
});

Deno.test("user-key: a missing key or an unknown region fails cleanly", async () => {
  const noKey = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, noKey.ctx)).ok, false);
  assertEquals(noKey.calls.length, 0);

  const badRegion = mockCtx([]);
  const result = await auth.test!({
    credential: { apiKey: "NRAK-X", region: "APAC" },
  } as never, badRegion.ctx);
  assertEquals(result.ok, false);
  assert(/US and EU/.test(result.message!), result.message);
});

Deno.test("user-key: an unreachable endpoint fails cleanly", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/could not reach/.test(result.message!), result.message);
});

/** Nearly every query needs an account id, and the key does not carry one. */
Deno.test("user-key: afterConnect records the region and an account id", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: {
        actor: {
          user: { name: "Ada" },
          accounts: [{ id: 12345, name: "Prod" }, { id: 67890, name: "Staging" }],
        },
      },
    },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.region, "US");
  assertEquals(display.userName, "Ada");
  assertEquals(display.accountId, 12345, "the first the key can see");
  assertEquals(display.accountCount, 2);
});

Deno.test("user-key: a typed account id wins over the first one found", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: { actor: { user: { name: "Ada" }, accounts: [{ id: 12345 }, { id: 67890 }] } } },
  }]);
  const display = await auth.afterConnect!({
    credential: { ...cred, accountId: "67890" },
  }, ctx) as Record<string, unknown>;
  assertEquals(display.accountId, 67890);
});

Deno.test("user-key: afterConnect still records the region when the query fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display, { region: "US" });
});

/** Three key types, one error message — the hints have to carry the distinction. */
Deno.test("user-key: the hints name the key type and the region trap", () => {
  const key = auth.fields!.find((f) => f.key === "apiKey")!;
  assert(/License or Ingest key/.test(key.hint!), key.hint);
  assertEquals(key.type, "secret");

  const region = auth.fields!.find((f) => f.key === "region")!;
  assert(/authentication required/.test(region.hint!), region.hint);
});
