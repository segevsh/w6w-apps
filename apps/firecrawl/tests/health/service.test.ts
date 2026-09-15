import { assertEquals } from "@std/assert";
import service, { componentKey, mapResourceStatus } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function page(
  resources: Array<{ name: string; status: string }>,
  attrs: Record<string, unknown> = {},
) {
  return {
    data: {
      attributes: {
        company_name: "Firecrawl",
        company_url: "https://firecrawl.dev",
        custom_domain: "status.firecrawl.dev",
        aggregate_state: "operational",
        ...attrs,
      },
    },
    included: resources.map((r) => ({
      type: "status_page_resource",
      attributes: { public_name: r.name, status: r.status },
    })),
  };
}

Deno.test("mapResourceStatus: operational and resolved map to ok", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("resolved"), "ok");
});

Deno.test("mapResourceStatus: degraded and maintenance map to degraded", () => {
  assertEquals(mapResourceStatus("degraded"), "degraded");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
});

Deno.test("mapResourceStatus: downtime and down map to down", () => {
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus("down"), "down");
});

Deno.test("mapResourceStatus: an unrecognised value is unknown, never guessed", () => {
  assertEquals(mapResourceStatus("something-new"), "unknown");
  assertEquals(mapResourceStatus(undefined), "unknown");
});

Deno.test("componentKey: slugifies a monitor's public name", () => {
  assertEquals(componentKey("api.firecrawl.dev"), "api-firecrawl-dev");
});

Deno.test("service: both monitors operational -> ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page([
      { name: "api.firecrawl.dev", status: "operational" },
      { name: "firecrawl.dev", status: "operational" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["api-firecrawl-dev"].state, "ok");
});

Deno.test("service: the API monitor down rolls up to down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page([
      { name: "api.firecrawl.dev", status: "downtime" },
      { name: "firecrawl.dev", status: "operational" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message?.includes("api.firecrawl.dev"), true);
});

Deno.test("service: an unrelated monitor added later is ignored", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page([
      { name: "api.firecrawl.dev", status: "operational" },
      { name: "firecrawl.dev", status: "operational" },
      { name: "Some New Thing", status: "downtime" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Firecrawl's reports unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page([{ name: "api.firecrawl.dev", status: "operational" }], {
      company_name: "SomeOtherCompany",
      company_url: "https://someothercompany.example",
      custom_domain: "status.someothercompany.example",
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unsigned and declares its own status-host allowlist, never the app's", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.firecrawl.dev"]);
});
