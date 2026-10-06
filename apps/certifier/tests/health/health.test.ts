import { assertEquals } from "@std/assert";
import service, { monitorKey } from "../../health/service.ts";
import api from "../../health/api.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const mon = (name: string, latestStatus?: boolean) => ({ name, type: "http", latestStatus });
const run = (c: typeof service, ctx: never) => c.check!({} as never, ctx);

Deno.test("service: declares the status host, no credential, and keys monitors by slug", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.certifier.io"]);
  assertEquals(monitorKey("Database & Storage"), "database-storage");
});

Deno.test("service: all monitors up -> ok with six components", async () => {
  const names = [
    "Certifier App",
    "Issuer Portal",
    "API",
    "Database & Storage",
    "Docs",
    "Help Center",
  ];
  const { ctx, calls } = mockCtx([{ body: { monitors: names.map((n) => mon(n, true)) } }]);
  const r = await run(service, ctx as never);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}).length, 6);
  assertEquals(calls[0].url, "https://status.certifier.io/api/status");
});

Deno.test("service: only the API monitor decides; a down Help Center is detail", async () => {
  const { ctx } = mockCtx([{ body: { monitors: [mon("API", true), mon("Help Center", false)] } }]);
  const r = await run(service, ctx as never);
  assertEquals(r.state, "ok");
  assertEquals(r.components?.["help-center"].state, "down");
  assertEquals(r.message, "also down: Help Center");
});

Deno.test("service: API monitor down -> down", async () => {
  const { ctx } = mockCtx([{ body: { monitors: [mon("API", false), mon("Docs", true)] } }]);
  const r = await run(service, ctx as never);
  assertEquals(r.state, "down");
  assertEquals(r.message, "API monitor is down");
});

Deno.test("service: no API monitor, no monitors, 404 or unreadable body -> unknown, never down", async () => {
  for (
    const resp of [
      { body: { monitors: [mon("Docs", true)] } },
      { body: { monitors: [] } },
      { status: 404, body: errorBody("not_found", "x") },
      { body: "<html>" },
    ]
  ) {
    const { ctx } = mockCtx([resp]);
    assertEquals((await run(service, ctx as never)).state, "unknown");
  }
});

Deno.test("api: Certifier's own JSON 401 passes as reachable, unsigned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: errorBody("unauthorized", "Unauthorized"),
  }]);
  const r = await api.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://api.certifier.io/v1/groups?limit=1");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: 5xx -> down, 429 -> degraded, foreign body -> unknown", async () => {
  const cases = [
    [{ status: 502, body: "bad gateway" }, "down"],
    [{ status: 429, body: errorBody("rate_limited", "x") }, "degraded"],
    [{ status: 200, body: "<html>shell</html>" }, "unknown"],
  ] as const;
  for (const [resp, state] of cases) {
    const { ctx } = mockCtx([resp]);
    assertEquals((await api.check!({} as never, ctx)).state, state);
  }
});
