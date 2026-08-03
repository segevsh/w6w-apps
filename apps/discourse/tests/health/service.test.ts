import { assert, assertEquals } from "@std/assert";
import service, { componentId, mapStatusCode, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** A trimmed but structurally faithful copy of a real api.status.io payload. */
function payload(overrides: Record<string, unknown> = {}) {
  return {
    result: {
      status_overall: { status: "Operational", status_code: 100 },
      status: [
        {
          id: "639ccdc23d5abf0584f37fcb",
          name: "Discourse Starter, Basic, Pro, and Business Hosting",
          status: "Operational",
          status_code: 100,
        },
        {
          id: "5e21429ba833ac0889fb5fa6",
          name: "Discourse Enterprise Hosting",
          status: "Operational",
          status_code: 100,
        },
        {
          id: "5f84770f044a4704b87923b2",
          name: "Website",
          status: "Operational",
          status_code: 100,
        },
        { id: "62603a8ddd913804ce5f35fb", name: "Meta", status: "Operational", status_code: 100 },
      ],
      incidents: [],
      maintenance: { active: [], upcoming: [] },
      ...overrides,
    },
  };
}

Deno.test("service: declares the Status.io endpoint, unsigned, with its own egress", () => {
  assertEquals(STATUS_URL, "https://api.status.io/1.0/status/5e2141ce30dc5c04b3ac32fc");
  assertEquals(service.network?.allow, ["api.status.io"]);
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  // Widening egress is bound to an unsigned posture; `none` is this kind's default.
  assert(service.credential === undefined || service.credential === "none");
  // Speaks only for Discourse's hosting, so it must never worsen a self-hosted
  // tenant's verdict.
  assertEquals(service.severity, "informational");
});

Deno.test("service: maps Status.io's documented incident-status codes", () => {
  assertEquals(mapStatusCode(100), "ok"); // Operational
  assertEquals(mapStatusCode(200), "degraded"); // Maintenance
  assertEquals(mapStatusCode(300), "degraded"); // Degraded Performance
  assertEquals(mapStatusCode(400), "degraded"); // Partial Service Disruption
  assertEquals(mapStatusCode(500), "down"); // Service Disruption
  assertEquals(mapStatusCode(600), "degraded"); // Security Event
  assertEquals(mapStatusCode(undefined), "unknown");
  assertEquals(mapStatusCode(999), "unknown");
});

Deno.test("service: component ids are stable slugs of the vendor's names", () => {
  assertEquals(
    componentId("Discourse Starter, Basic, Pro, and Business Hosting"),
    "discourse-starter-basic-pro-and-business-hosting",
  );
  assertEquals(componentId("EU (dub) 1"), "eu-dub-1");
});

Deno.test("service: an all-clear page reports ok, one component per product line", async () => {
  const { ctx, calls } = mockCtx([{ body: payload() }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, undefined);
  assertEquals(Object.keys(report.components ?? {}).length, 4);
  assertEquals(report.components?.website, { state: "ok" });
});

Deno.test("service: a disrupted component surfaces as down, and is named in the message", async () => {
  const body = payload();
  body.result.status[0].status = "Service Disruption";
  body.result.status[0].status_code = 500;
  body.result.status_overall = { status: "Service Disruption", status_code: 500 };
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(
    report.components?.["discourse-starter-basic-pro-and-business-hosting"]?.state,
    "down",
  );
  assert(report.message!.includes("discourse-starter-basic-pro-and-business-hosting"));
});

Deno.test("service: falls back to worst-of when the page omits its own roll-up", async () => {
  const body = payload();
  body.result.status[1].status_code = 300;
  body.result.status[1].status = "Degraded Performance";
  delete (body.result as { status_overall?: unknown }).status_overall;
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: counts open incidents and active maintenance in the message", async () => {
  const body = payload({ incidents: [{ id: "i1" }], maintenance: { active: [{ id: "m1" }] } });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assert(report.message!.includes("1 open incident(s)"));
  assert(report.message!.includes("1 active maintenance window(s)"));
});

Deno.test("service: a broken status API reports unknown, never down", async () => {
  // A status page that itself fails says nothing about Discourse. Calling that
  // an outage would be a lie.
  for (const status of [404, 500, 503]) {
    const { ctx } = mockCtx([{ status, body: {} }]);
    const report = await service.check!({}, ctx);
    assertEquals(report.state, "unknown");
    assert(report.message!.includes(String(status)));
  }
});

Deno.test("service: Status.io's 200-with-error body is caught, not read as ok", async () => {
  // An unknown page id answers HTTP 200 with `{"error": "status page not found"}`.
  // A check that trusted the status code alone would report `ok` forever.
  const { ctx } = mockCtx([{ status: 200, body: { error: "status page not found" } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("status page not found"));
});

Deno.test("service: an empty or unparseable payload reports unknown", async () => {
  const empty = mockCtx([{ body: { result: { status: [] } } }]);
  assertEquals((await service.check!({}, empty.ctx)).state, "unknown");

  const junk = mockCtx([{ status: 200, body: "<html>nope</html>" }]);
  assertEquals((await service.check!({}, junk.ctx)).state, "unknown");

  const unnamed = mockCtx([{ body: { result: { status: [{ status_code: 100 }] } } }]);
  assertEquals((await service.check!({}, unnamed.ctx)).state, "unknown");
});
