import { assertEquals } from "@std/assert";
import service, { isV1Api, mapResourceStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = (resources: Array<[string, string]>, company = "Clientify") => ({
  data: {
    attributes: {
      company_name: company,
      company_url: "https://clientify.com",
      custom_domain: "status.clientify.com",
      aggregate_state: "operational",
    },
  },
  included: [
    { id: "x", type: "status_page_section", attributes: { name: "s" } },
    ...resources.map(([n, s], i) => ({
      id: String(i),
      type: "status_page_resource",
      attributes: { public_name: n, status: s },
    })),
  ],
});

const run = async (body: unknown, status = 200) => {
  const { ctx, calls } = mockCtx([{ status, body }]);
  const r = await service.check!({} as never, ctx);
  return { r, calls };
};

Deno.test("service: unsigned, app-scoped, own status host in the per-hook allowlist", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network, { allow: ["status.clientify.com"] });
  assertEquals(STATUS_URL, "https://status.clientify.com/index.json");
});

Deno.test("service: V1 components operational -> ok, fetches the index.json", async () => {
  const { r, calls } = await run(page([
    ["API V1 Principal", "operational"],
    ["API V1 Secundaria", "operational"],
    ["API V2", "operational"],
  ]));
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(Object.keys(r.components ?? {}).length, 3);
});

Deno.test("service: a V1 outage drives the verdict; the worst V1 component wins", async () => {
  const { r } = await run(page([
    ["API V1 Principal", "operational"],
    ["API V1 Secundaria", "downtime"],
  ]));
  assertEquals(r.state, "down");
  assertEquals(r.message?.includes("API V1 Secundaria (downtime)"), true);
});

Deno.test("service: an outage elsewhere (V2, forms) does not move the verdict, shown capped at degraded", async () => {
  const { r } = await run(page([
    ["API V1 Principal", "operational"],
    ["API V1 Secundaria", "operational"],
    ["API V2", "downtime"],
    ["Formularios", "downtime"],
  ]));
  assertEquals(r.state, "ok");
  assertEquals(r.components?.["api-v2"].state, "degraded");
});

Deno.test("service: no V1 component -> unknown, never ok", async () => {
  const { r } = await run(page([["API V2", "operational"]]));
  assertEquals(r.state, "unknown");
});

Deno.test("service: a page that is not Clientify's -> unknown", async () => {
  const body = page([["API V1 Principal", "operational"]], "Other");
  body.data.attributes.company_url = "https://other.test";
  body.data.attributes.custom_domain = "status.other.test";
  assertEquals((await run(body)).r.state, "unknown");
});

Deno.test("service: HTTP error or non-document body -> unknown", async () => {
  assertEquals((await run({}, 500)).r.state, "unknown");
  assertEquals((await run({ hello: 1 })).r.state, "unknown");
});

Deno.test("service: status mapping and V1 matcher", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("degraded"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus("???"), "unknown");
  assertEquals(isV1Api({ attributes: { public_name: "API V1 Principal" } }), true);
  assertEquals(isV1Api({ attributes: { public_name: "API V2" } }), false);
});
