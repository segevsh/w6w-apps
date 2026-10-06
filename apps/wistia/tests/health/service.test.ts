import { assert, assertEquals } from "@std/assert";
import service, { API_COMPONENTS, mapStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const names = [
  "Group Record",
  "Billing",
  "Transcripts",
  "Record",
  "Edit",
  "wistia.com",
  "App",
  "Uploads",
  "Encoding",
  "Stats",
  "Embeds",
  "Live",
];

function body(overrides: Record<string, string> = {}) {
  return {
    components: names.map((name) => ({
      id: `id-${name}`,
      name,
      status: overrides[name] ?? "OPERATIONAL",
      isParent: false,
      children: [],
    })),
  };
}

Deno.test("service: declared as an informational, unauthenticated check on the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.wistia.com"]);
  assertEquals(new URL(STATUS_URL).host, "status.wistia.com");
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
  const { ctx, calls } = mockCtx([{ body: body() }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components!).length, 12);
});

Deno.test("service: an API-relevant outage decides the verdict", async () => {
  for (const name of API_COMPONENTS) {
    const { ctx } = mockCtx([{ body: body({ [name]: "MAJOROUTAGE" }) }]);
    const out = await service.check!({} as never, ctx);
    assertEquals(out.state, "down", name);
    assert(out.message!.includes(name));
  }
});

Deno.test("service: an unrelated component never moves the verdict", async () => {
  const { ctx } = mockCtx([{ body: body({ Live: "MAJOROUTAGE", Billing: "PARTIALOUTAGE" }) }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components!["id-Live"].state, "down");
  assert(out.message!.includes("Live (MAJOROUTAGE)"));
});

Deno.test("service: a broken or empty status page is unknown, never down", async () => {
  for (
    const r of [
      { status: 503, body: "x" },
      { body: "not json" },
      { body: { components: [] } },
      { body: { components: [{ name: "Live", status: "OPERATIONAL" }] } },
    ]
  ) {
    const { ctx } = mockCtx([r]);
    assertEquals((await service.check!({} as never, ctx)).state, "unknown");
  }
});
