import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const run = (r: Parameters<typeof mockCtx>[0]) => quota.check!({} as never, mockCtx(r).ctx);

Deno.test("quota: positive balances are ok and reported as two quota entries", async () => {
  const r = await run([{ body: { credits: 150, verifier_credits: 100 } }]);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [
    { id: "finder-credits", remaining: 150, unit: "credits" },
    { id: "verifier-credits", remaining: 100, unit: "credits" },
  ]);
});

Deno.test("quota: an exhausted balance degrades and names which one", async () => {
  const r = await run([{ body: { credits: 0, verifier_credits: 5 } }]);
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "finder credits exhausted");
});

Deno.test("quota: a failed probe or a body without balances is unknown, never invented", async () => {
  assertEquals(
    (await run([{ status: 401, body: { message: "Unauthenticated." } }])).state,
    "unknown",
  );
  assertEquals((await run([{ body: { credits: "many" } }])).state, "unknown");
});
