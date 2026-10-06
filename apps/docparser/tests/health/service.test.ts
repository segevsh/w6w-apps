import { assert, assertEquals } from "@std/assert";
import service, { API_COMPONENT, mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const names = [
  "Docparser Application",
  "HTTP REST API",
  "Webhook Integrations",
  "Email Reception Server",
];

function body(overrides: Record<string, string> = {}, pageName = "Docparser") {
  return {
    page: { name: pageName },
    components: names.map((name) => ({
      id: `id-${name}`,
      name,
      status: overrides[name] ?? "operational",
      group: false,
    })),
  };
}

Deno.test("service: service check on the status host, no credential", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.docparser.com"]);
  assertEquals(new URL(STATUS_URL).host, "status.docparser.com");
});

Deno.test("service: maps Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("nonsense"), "unknown");
});

Deno.test("service: all operational is ok", async () => {
  const { ctx, calls } = mockCtx([{ body: body() }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components!).length, 4);
});

Deno.test("service: the HTTP REST API component decides; others never move the verdict", async () => {
  const down = mockCtx([{ body: body({ [API_COMPONENT]: "major_outage" }) }]);
  const out = await service.check!({} as never, down.ctx);
  assertEquals(out.state, "down");
  assert(out.message!.includes(API_COMPONENT));

  const other = mockCtx([{ body: body({ "Webhook Integrations": "major_outage" }) }]);
  const out2 = await service.check!({} as never, other.ctx);
  assertEquals(out2.state, "ok");
  assertEquals(out2.components!["id-Webhook Integrations"].state, "down");
});

Deno.test("service: a broken, foreign or API-less page is unknown, never down", async () => {
  for (
    const r of [
      { status: 503, body: "x" },
      { body: "not json" },
      { body: body({}, "Someone Else") },
      { body: { page: { name: "Docparser" }, components: [] } },
      {
        body: {
          page: { name: "Docparser" },
          components: [{ name: "Other", status: "operational" }],
        },
      },
    ]
  ) {
    const { ctx } = mockCtx([r]);
    assertEquals((await service.check!({} as never, ctx)).state, "unknown");
  }
});
