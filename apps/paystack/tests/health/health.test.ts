import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import service, {
  API_COMPONENT_ID,
  COMPONENTS_URL,
  mapStatus,
  SUMMARY_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const SUMMARY = { page: { name: "Paystack", url: "https://status.paystack.com", status: "UP" } };

function components(overrides: Record<string, string> = {}) {
  const group = { id: "g1", name: "Platform & Infrastructure" };
  const rows: Array<[string, string, typeof group | null]> = [
    ["g1", "Platform & Infrastructure", null],
    [API_COMPONENT_ID, "API", group],
    ["w", "Webhooks", group],
    ["r", "Refunds", group],
    ["cards-ng", "Cards", { id: "ng", name: "NIGERIA" }],
  ];
  return {
    components: rows.map(([id, name, g]) => ({
      id,
      name,
      status: overrides[name] ?? "OPERATIONAL",
      group: g,
    })),
  };
}

Deno.test("service: declared as an unauthenticated service check on the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.paystack.com"]);
  assertEquals(new URL(SUMMARY_URL).host, "status.paystack.com");
  assertEquals(new URL(COMPONENTS_URL).host, "status.paystack.com");
});

Deno.test("service: maps Instatus's vocabulary", () => {
  assertEquals(mapStatus("OPERATIONAL"), "ok");
  assertEquals(mapStatus("DEGRADEDPERFORMANCE"), "degraded");
  assertEquals(mapStatus("PARTIALOUTAGE"), "degraded");
  assertEquals(mapStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapStatus("MAJOROUTAGE"), "down");
  assertEquals(mapStatus("operational"), "unknown");
  assertEquals(mapStatus(undefined), "unknown");
});

Deno.test("service: all operational is ok and reports every component", async () => {
  const { ctx, calls } = mockCtx([{ body: SUMMARY }, { body: components() }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(calls.map((c) => c.url), [SUMMARY_URL, COMPONENTS_URL]);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components!).length, 5);
});

Deno.test("service: the API component alone decides the verdict", async () => {
  const down = mockCtx([{ body: SUMMARY }, { body: components({ API: "MAJOROUTAGE" }) }]);
  const d = await service.check!({} as never, down.ctx);
  assertEquals(d.state, "down");
  assert(d.message!.includes("API: MAJOROUTAGE"));

  const deg = mockCtx([{ body: SUMMARY }, { body: components({ API: "PARTIALOUTAGE" }) }]);
  assertEquals((await service.check!({} as never, deg.ctx)).state, "degraded");
});

Deno.test("service: an unrelated component is detail, never the verdict", async () => {
  const { ctx } = mockCtx([
    { body: SUMMARY },
    { body: components({ Cards: "MAJOROUTAGE", Webhooks: "PARTIALOUTAGE" }) },
  ]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components!["cards-ng"].state, "down");
  assert(out.message!.includes("NIGERIA / Cards (MAJOROUTAGE)"));
});

Deno.test("service: a page that is not Paystack's, or an unreadable one, is unknown, never down", async () => {
  for (
    const responses of [
      [{ body: { page: { name: "Someone Else" } } }],
      [{ body: SUMMARY }, { status: 503, body: "x" }],
      [{ body: SUMMARY }, { body: "not json" }],
      [{ body: SUMMARY }, { body: { components: [] } }],
      [{ status: 500, body: "x" }],
      [{ body: SUMMARY }, {
        body: { components: [{ id: "x", name: "Website", status: "OPERATIONAL" }] },
      }],
    ]
  ) {
    const { ctx } = mockCtx(responses);
    assertEquals((await service.check!({} as never, ctx)).state, "unknown");
  }
});

Deno.test("quota: a declared absence, informational, with no check hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(typeof quota.unavailable?.reason === "string" && quota.unavailable.reason.length > 0);
  assertEquals(quota.check, undefined);
});
