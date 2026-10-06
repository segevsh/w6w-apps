import { assertEquals } from "@std/assert";
import check, { classify, PROBES } from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const REFUSAL = { code: 401, message: "Unauthorized. Token is required." };

Deno.test("api health: probes all four hosts unsigned; Diffbot's JSON 401 is a pass", async () => {
  const { ctx, calls } = mockCtx(PROBES.map(() => ({ status: 401, body: REFUSAL })));
  const out = await check.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls.length, 4);
  assertEquals(new Set(calls.map((c) => new URL(c.url).hostname)).size, 4);
  for (const c of calls) {
    assertEquals(c.url.includes("token="), false);
    assertEquals(c.headers["authorization"], undefined);
  }
  assertEquals(Object.keys(out.components!).length, 4);
});

Deno.test("api health: a 5xx on any host is down and named", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: REFUSAL },
    { status: 503, body: "oops" },
    { status: 401, body: REFUSAL },
    { status: 401, body: REFUSAL },
  ]);
  const out = await check.check!({} as never, ctx);
  assertEquals(out.state, "down");
  assertEquals(Object.values(out.components!).filter((c) => c.state === "down").length, 1);
});

Deno.test("api health: a thrown fetch is down; classify reads the body, not just the status", () => {
  assertEquals(classify(401, "<html>proxy</html>").state, "unknown");
  assertEquals(classify(401, JSON.stringify({ message: "x" })).state, "unknown");
  assertEquals(classify(401, JSON.stringify(REFUSAL)).state, "ok");
  assertEquals(classify(200, "").state, "ok");
  assertEquals(classify(502, "").state, "down");
});

Deno.test("api health: a network error is down", async () => {
  const { ctx } = mockCtx([]);
  const out = await check.check!({} as never, ctx);
  assertEquals(out.state, "down");
});
