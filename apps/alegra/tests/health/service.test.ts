import { assertEquals } from "@std/assert";
import service, { API_RESOURCE_ID, mapStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => service.check!({} as never, ctx);

function page(apiStatus: string, appStatus = "operational", extra: Record<string, unknown> = {}) {
  return {
    data: { attributes: { company_name: "Alegra", custom_domain: "status.alegra.com" } },
    included: [
      { id: "156160", type: "status_page_section", attributes: { name: "Alegra Contabilidad" } },
      {
        id: "1607824",
        type: "status_page_resource",
        attributes: { public_name: "App Alegra Contabilidad", status: appStatus },
      },
      {
        id: API_RESOURCE_ID,
        type: "status_page_resource",
        attributes: { public_name: "API Alegra Contabilidad", status: apiStatus },
      },
      {
        id: "8316799",
        type: "status_page_resource",
        attributes: { public_name: "Alegra Nómina", status: "downtime" },
      },
    ],
    ...extra,
  };
}

Deno.test("service: is an unsigned app-scoped check allowlisting only the status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.network, { allow: ["status.alegra.com"] });
  assertEquals(STATUS_URL, "https://status.alegra.com/index.json");
});

Deno.test("service: the API resource alone decides — other products down do not drive the verdict", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational") }]);
  const r = await run(ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  // detail still lists the other resources
  assertEquals(r.components!["alegra-n-mina"].state, "down");
  assertEquals(r.components!["api-alegra-contabilidad"].state, "ok");
});

Deno.test("service: a degraded or down API resource maps to degraded / down", async () => {
  assertEquals((await run(mockCtx([{ body: page("degraded") }]).ctx)).state, "degraded");
  const down = await run(mockCtx([{ body: page("downtime") }]).ctx);
  assertEquals(down.state, "down");
  assertEquals(down.message, "API Alegra Contabilidad: downtime");
});

Deno.test("service: the web app being down does not make the API down", async () => {
  assertEquals((await run(mockCtx([{ body: page("operational", "downtime") }]).ctx)).state, "ok");
});

Deno.test("service: the API resource is found by name when its id changes", async () => {
  const body = page("degraded");
  body.included[2].id = "999";
  assertEquals((await run(mockCtx([{ body }]).ctx)).state, "degraded");
});

Deno.test("service: a missing API resource, foreign page, bad HTTP or HTML shell is unknown", async () => {
  const noApi = page("operational");
  noApi.included.splice(2, 1);
  assertEquals((await run(mockCtx([{ body: noApi }]).ctx)).state, "unknown");

  const foreign = page("operational");
  foreign.data.attributes = { company_name: "Other", custom_domain: "status.other.com" };
  assertEquals((await run(mockCtx([{ body: foreign }]).ctx)).state, "unknown");

  assertEquals((await run(mockCtx([{ status: 503, body: "x" }]).ctx)).state, "unknown");
  assertEquals(
    (await run(mockCtx([{ body: "<html></html>", headers: { "content-type": "text/html" } }]).ctx))
      .state,
    "unknown",
  );
});

Deno.test("mapStatus: covers the Better Stack vocabulary", () => {
  assertEquals(mapStatus("operational"), "ok");
  assertEquals(mapStatus("resolved"), "ok");
  assertEquals(mapStatus("maintenance"), "degraded");
  assertEquals(mapStatus("down"), "down");
  assertEquals(mapStatus("weird"), "unknown");
  assertEquals(mapStatus(undefined), "unknown");
});
