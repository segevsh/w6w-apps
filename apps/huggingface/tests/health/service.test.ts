import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { mapResourceStatus, resourceKey, STATUS_URL } from "../../health/service.ts";

const page = (resources: Array<[string, string]>) => ({
  status: 200,
  body: {
    data: {
      type: "status_page",
      attributes: { company_name: "Hugging Face", aggregate_state: "operational" },
    },
    included: resources.map(([name, status], i) => ({
      id: String(i),
      type: "status_page_resource",
      attributes: { public_name: name, status },
    })),
  },
});

const allGood = page([["Hub", "operational"], ["Inference Endpoints", "operational"]]);

/** The Statuspage-shaped path on this host serves HTML with a 200. */
Deno.test("service: reads the Better Stack JSON route, not a Statuspage path", async () => {
  const { ctx, calls } = mockCtx([allGood]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assert(!calls[0].url.includes("summary.json"), calls[0].url);
  assertEquals(result.state, "ok");
});

Deno.test("service: the catch-all HTML reads as unknown, not as healthy", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<!DOCTYPE html><html>…</html>" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/serve HTML with a 200/.test(result.message!), result.message);
});

/** Reading the Hub and running inference are different dependencies. */
Deno.test("service: names which half is affected", async () => {
  const hub = mockCtx([page([["Hub", "downtime"], ["Inference Endpoints", "operational"]])]);
  const hubResult = await service.check!({}, hub.ctx);
  assert(/the Hub/.test(hubResult.message!), hubResult.message);

  const inference = mockCtx([page([["Hub", "operational"], ["Inference Endpoints", "degraded"]])]);
  const inferenceResult = await service.check!({}, inference.ctx);
  assert(/inference/.test(inferenceResult.message!), inferenceResult.message);
});

/** The router's third-party providers are not on this page at all. */
Deno.test("service: even a full outage is capped at degraded", async () => {
  const { ctx } = mockCtx([page([["Hub", "downtime"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.components!["hub"].state, "down");
});

Deno.test("service: only the affected resources are reported", async () => {
  const { ctx } = mockCtx([page([["Hub", "operational"], ["Website", "degraded"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(Object.keys(result.components ?? {}), ["website"]);
});

Deno.test("service: a page that is not Hugging Face's is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: { attributes: { company_name: "Someone Else" } }, included: [] },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/self-identifies/.test(result.message!), result.message);
});

Deno.test("service: a broken or unreachable status page is unknown", async () => {
  const broken = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, broken.ctx)).state, "unknown");

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof service.check>>[1];
  assertEquals((await service.check!({}, offline)).state, "unknown");
});

Deno.test("service: a page with no resources is unknown", async () => {
  const { ctx } = mockCtx([page([])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no resources/.test(result.message!), result.message);
});

Deno.test("service: maps Better Stack's vocabulary and slugs the names", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("degraded"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus(undefined), "unknown");
  assertEquals(
    resourceKey({ attributes: { public_name: "Inference Endpoints" } }, 0),
    "inference-endpoints",
  );
  assertEquals(resourceKey({}, 3), "resource-3");
});

/** The router's providers have their own outages, on nobody's page. */
Deno.test("service: says it does not cover the inference providers", () => {
  assert(
    /does NOT cover the third-party inference providers/.test(service.description!),
    service.description,
  );
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
});
