import { assert, assertEquals } from "@std/assert";
import service, { mapResourceStatus, resourceKey, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function page(adminStatus: string, other = "operational", company = "Memberstack") {
  const r = (name: string, status: string) => ({
    type: "status_page_resource",
    attributes: { public_name: name, status },
  });
  return {
    data: { attributes: { company_name: company, aggregate_state: "operational" } },
    included: [
      { type: "status_page_section", attributes: { name: "Memberstack" } },
      r("Client API", other),
      r("Admin API", adminStatus),
      r("Marketing Website", other),
    ],
  };
}

const run = (body: unknown, status = 200) => {
  const { ctx, calls } = mockCtx([{ status, body }]);
  return Promise.resolve(service.check!({} as never, ctx)).then((r) => ({ r, calls }));
};

Deno.test("service: reads the Better Stack /index.json on status.memberstack.com", async () => {
  const { r, calls } = await run(page("operational"));
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(STATUS_URL, "https://status.memberstack.com/index.json");
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!).sort(), [
    "admin-api",
    "client-api",
    "marketing-website",
  ]);
});

Deno.test("service: the verdict is the Admin API monitor, not the other components", async () => {
  assertEquals((await run(page("downtime"))).r.state, "down");
  assertEquals((await run(page("degraded"))).r.state, "degraded");
  const { r } = await run(page("operational", "downtime"));
  assertEquals(r.state, "ok", "a down marketing site must not turn the API check down");
  assertEquals(r.components!["marketing-website"].state, "down");
});

Deno.test("service: a missing Admin API monitor is unknown, never ok", async () => {
  const p = page("operational");
  p.included = p.included.filter((i) =>
    (i.attributes as { public_name?: string }).public_name !== "Admin API"
  );
  assertEquals((await run(p)).r.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies, an error, or junk is unknown", async () => {
  assertEquals((await run(page("operational", "operational", "Someone Else"))).r.state, "unknown");
  assertEquals((await run({}, 503)).r.state, "unknown");
  assertEquals((await run({ data: {} })).r.state, "unknown");
  assertEquals(
    (await run({ data: { attributes: { company_name: "Memberstack" } }, included: [] })).r
      .state,
    "unknown",
  );
});

Deno.test("service: declares the status host on the hook, unsigned", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.memberstack.com"]);
});

Deno.test("mapResourceStatus / resourceKey", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus("weird"), "unknown");
  assert(
    resourceKey({ attributes: { public_name: "DOM & Webflow Package" } }, 0) ===
      "dom-webflow-package",
  );
});
