import { assert, assertEquals } from "@std/assert";
import service, { slug, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function page(api: string, others = "operational", name = "MaintainX") {
  const res = (n: string, status: string) => ({
    type: "status_page_resource",
    attributes: { public_name: n, status, explicit_status: null },
  });
  return {
    data: { attributes: { company_name: name, custom_domain: "status.getmaintainx.com" } },
    included: [
      { type: "status_page_section", attributes: { name: "API" } },
      res("MaintainX App", others),
      res("REST API", api),
      res("GraphQL API", others),
      res("Website", others),
    ],
  };
}

// Better Stack serves index.json as text/html, so the mock does too.
const html = { "content-type": "text/html; charset=utf-8" };

Deno.test("service: declared as an unsigned app-scoped service check on the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.getmaintainx.com"]);
  assertEquals(STATUS_URL, "https://status.getmaintainx.com/en/index.json");
});

Deno.test("service: all operational is ok, with a component per resource", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational"), headers: html }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}), [
    "maintainx-app",
    "rest-api",
    "graphql-api",
    "website",
  ]);
});

Deno.test("service: the REST API component decides the verdict", async () => {
  const down = await service.check!(
    {} as never,
    mockCtx([{ body: page("downtime"), headers: html }]).ctx,
  );
  assertEquals(down.state, "down");
  assert(down.message?.includes("REST API: downtime"));
  const degraded = await service.check!(
    {} as never,
    mockCtx([{ body: page("degraded"), headers: html }]).ctx,
  );
  assertEquals(degraded.state, "degraded");
});

Deno.test("service: other components degrade the detail but not the verdict", async () => {
  const { ctx } = mockCtx([{ body: page("operational", "downtime"), headers: html }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components?.["website"].state, "down");
});

Deno.test("service: a page that does not identify as MaintainX is unknown", async () => {
  const { ctx } = mockCtx([{
    body: page("operational", "operational", "Someone Else"),
    headers: html,
  }]);
  // custom_domain still matches, so identify via name only by clearing it
  const body = page("operational", "operational", "Someone Else");
  body.data.attributes.custom_domain = "status.other.example";
  const r = await service.check!({} as never, mockCtx([{ body, headers: html }]).ctx);
  assertEquals(r.state, "unknown");
  void ctx;
});

Deno.test("service: HTML shell, non-200 and missing REST API are unknown, never down", async () => {
  const shell = await service.check!(
    {} as never,
    mockCtx([{ body: "<html></html>", headers: html }]).ctx,
  );
  assertEquals(shell.state, "unknown");
  const err = await service.check!({} as never, mockCtx([{ status: 500, body: "x" }]).ctx);
  assertEquals(err.state, "unknown");
  const noApi = page("operational");
  noApi.included = noApi.included.filter((e) =>
    (e.attributes as { public_name?: string }).public_name !== "REST API"
  );
  const r = await service.check!({} as never, mockCtx([{ body: noApi, headers: html }]).ctx);
  assertEquals(r.state, "unknown");
});

Deno.test("service: slug", () => assertEquals(slug("GraphQL API"), "graphql-api"));
