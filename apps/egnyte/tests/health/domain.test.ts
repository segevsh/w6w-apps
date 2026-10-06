import { assertEquals } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import domain from "../../health/domain.ts";

Deno.test("domain: a 401 passes — the account is serving", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ status: 401, body: { fault: {} } }]);
  assertEquals((await domain.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/userinfo");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("domain: 404 and 5xx are down", async () => {
  assertEquals((await domain.check!({}, mockEgnyteCtx([{ status: 404 }]).ctx)).state, "down");
  assertEquals((await domain.check!({}, mockEgnyteCtx([{ status: 503 }]).ctx)).state, "down");
});

Deno.test("domain: a transport failure is down, a missing domain is unknown", async () => {
  const { ctx } = mockEgnyteCtx([]); // unqueued fetch throws
  assertEquals((await domain.check!({}, ctx)).state, "down");
  const bare = mockEgnyteCtx([]).ctx;
  (bare as { connection?: unknown }).connection = { display: {} };
  assertEquals((await domain.check!({}, bare)).state, "unknown");
});
