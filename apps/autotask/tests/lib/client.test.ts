import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  AutotaskClient,
  checkPageUrl,
  describeError,
  filterOf,
  MATCH_ALL,
  redact,
  zoneBase,
  zoneOf,
} from "../../lib/client.ts";
import { canonicalEntity, ENTITIES } from "../../lib/entities.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("zoneOf: accepts numbers, labels and hostnames, refuses unpublished zones", () => {
  assertEquals(zoneOf("2"), "2");
  assertEquals(zoneOf(14), "14");
  assertEquals(zoneOf("Zone 29"), "29");
  assertEquals(zoneOf("webservices5.autotask.net"), "5");
  assertEquals(zoneOf("7"), undefined);
  assertEquals(zoneOf("13"), undefined);
  assertEquals(zoneOf(""), undefined);
  assertEquals(zoneOf(undefined), undefined);
});

Deno.test("zoneBase: builds the vendor's documented base URL", () => {
  assertEquals(zoneBase("2"), "https://webservices2.autotask.net/atservicesrest/V1.0");
});

Deno.test("redact: strips secret-bearing keys at any depth, keeps the rest", () => {
  const out = redact<unknown>({
    items: [{ id: 1, secretKey: "s", nested: { password: "p", secret: "x", keep: 1 } }],
  });
  assertEquals(out, { items: [{ id: 1, nested: { keep: 1 } }] });
});

Deno.test("filterOf: empty is match-all; accepts a bare array, a wrapper and a single filter", () => {
  assertEquals(filterOf(undefined), MATCH_ALL);
  assertEquals(filterOf("[]"), MATCH_ALL);
  const f = [{ op: "eq", field: "status", value: 1 }];
  assertEquals(filterOf(JSON.stringify(f)), f);
  assertEquals(filterOf({ filter: f }), f);
  assertEquals(filterOf(f[0]), f);
  assertThrows(() => filterOf('"nope"'), Error, "array of filter objects");
  assertThrows(() => filterOf("{bad"), Error, "not valid JSON");
});

Deno.test("describeError: reads the errors array; a bodyless 401 names every candidate", () => {
  assertEquals(describeError(500, '{"errors":["a","b"]}'), "a; b");
  assert(describeError(401, "").includes("wrong secret"));
  assert(describeError(401, "").includes("zone"));
  assert(describeError(429, "").includes("10,000"));
  assertEquals(describeError(502, ""), "HTTP 502");
});

Deno.test("checkPageUrl: only https zone URLs under /atservicesrest", () => {
  checkPageUrl("https://webservices2.autotask.net/ATServicesRest/V1.0/Tickets/query?search=x");
  for (
    const bad of [
      "http://webservices2.autotask.net/atservicesrest/v1.0/x",
      "https://evil.example/atservicesrest/v1.0/x",
      "https://webservices2.autotask.net.evil.example/atservicesrest/v1.0/x",
      "https://webservices2.autotask.net/other",
      "not a url",
    ]
  ) assertThrows(() => checkPageUrl(bad), Error, "pageUrl");
});

Deno.test("entities: no webhook, attachment or secret-bearing entity is queryable", () => {
  for (const e of ENTITIES) {
    assert(!/webhook|attachment/i.test(e), e);
  }
  for (const e of ["ClientPortalUsers", "IntegrationVendorInsights", "IntegrationVendorWidgets"]) {
    assertEquals(canonicalEntity(e), undefined);
  }
  assertEquals(canonicalEntity("tickets"), "Tickets");
  assertEquals(ENTITIES.length, 176);
});

Deno.test("client: refuses a connection with no zone, before any request", () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  assertThrows(() => new AutotaskClient(ctx), Error, "no valid Autotask zone");
  assertEquals(calls.length, 0);
});

Deno.test("client: a 500 with an errors array is thrown with the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { errors: ["Title is required"] } }], {
    display: { zone: "2" },
  });
  const err = await assertRejects(() => new AutotaskClient(ctx).write("POST", "/Tickets", {}));
  assert(String(err).includes("Title is required"));
});

Deno.test("client: a 200 that still carries errors is refused; secrets are redacted on success", async () => {
  const bad = mockCtx([{ body: { errors: ["nope"] } }], { display: { zone: "2" } });
  await assertRejects(() => new AutotaskClient(bad.ctx).call("GET", "/X"), Error, "nope");
  const ok = mockCtx([{ body: { items: [{ id: 1, secretKey: "k" }], pageDetails: {} } }], {
    display: { zone: "2" },
  });
  const res = await new AutotaskClient(ok.ctx).query("Tickets", { filter: MATCH_ALL });
  assertEquals(res.items, [{ id: 1 }]);
});

Deno.test("client: page() refuses another zone's URL", async () => {
  const { ctx } = mockCtx([], { display: { zone: "2" } });
  await assertRejects(
    () =>
      new AutotaskClient(ctx).page("https://webservices3.autotask.net/atservicesrest/v1.0/T/query"),
    Error,
    "different zone",
  );
});
