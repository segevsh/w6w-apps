import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, {
  capState,
  mapResourceStatus,
  resourceKey,
  STATUS_URL,
} from "../../health/service.ts";

/** The live page's own shape, trimmed — sections, then resources. */
const page = (resources: Array<[string, string, number]>, aggregate = "operational") => ({
  status: 200,
  body: {
    data: {
      type: "status_page",
      attributes: {
        company_name: "Qdrant",
        company_url: "https://qdrant.com",
        custom_domain: "status.qdrant.io",
        aggregate_state: aggregate,
      },
    },
    included: [
      {
        id: "152796",
        type: "status_page_section",
        attributes: { name: "Current status by service" },
      },
      {
        id: "154240",
        type: "status_page_section",
        attributes: { name: "Cloud Qdrant Database Clusters" },
      },
      ...resources.map(([name, status, section], i) => ({
        id: String(900000 + i),
        type: "status_page_resource",
        attributes: { public_name: name, status, status_page_section_id: section },
      })),
    ],
  },
});

const CONTROL = 152796;
const CLUSTERS = 154240;

const allGood = page([
  ["Website / Documentation", "operational", CONTROL],
  ["Cloud UI", "operational", CONTROL],
  ["Cloud API (extern)", "operational", CONTROL],
  ["AWS us-east-1", "operational", CLUSTERS],
  ["GCP europe-west3", "operational", CLUSTERS],
]);

Deno.test("service: reads the Better Stack JSON route, not a Statuspage path", async () => {
  const { ctx, calls } = mockCtx([allGood]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assert(!calls[0].url.includes("summary.json"), calls[0].url);
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components ?? {}).length, 5);
});

/**
 * One region down is total for the tenants in it and irrelevant to everyone
 * else. An app-scoped check has no connection and so no region.
 */
Deno.test("service: a single region outage is capped at degraded, and says why", async () => {
  const { ctx } = mockCtx([
    page([
      ["Cloud UI", "operational", CONTROL],
      ["AWS us-east-1", "downtime", CLUSTERS],
      ["GCP europe-west3", "operational", CLUSTERS],
    ], "downtime"),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/AWS us-east-1/.test(result.message!), result.message);
  assert(/cannot know which region/.test(result.message!), result.message);
});

/** Every region at once is no longer a "which region are you in" question. */
Deno.test("service: every region down is a real outage", async () => {
  const { ctx } = mockCtx([
    page([
      ["Cloud UI", "operational", CONTROL],
      ["AWS us-east-1", "downtime", CLUSTERS],
      ["GCP europe-west3", "downtime", CLUSTERS],
    ], "downtime"),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/every cluster region is down/.test(result.message!), result.message);
});

/** The console being down does not stop a cluster answering queries. */
Deno.test("service: control-plane trouble is reported but capped", async () => {
  const { ctx } = mockCtx([
    page([
      ["Cloud UI", "downtime", CONTROL],
      ["AWS us-east-1", "operational", CLUSTERS],
    ], "downtime"),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/Cloud UI/.test(result.message!), result.message);
});

/**
 * Every Statuspage-shaped path on this host answers 200 with the page's own
 * HTML, so a parse failure is the signal that the JSON route has gone — not an
 * anomaly to swallow.
 */
Deno.test("service: the catch-all HTML reads as unknown, not as healthy", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<!DOCTYPE html><html>…</html>" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/index\.json/.test(result.message!), result.message);
});

/** A redirect or rebrand pointing at somebody else's healthy page is not good news. */
Deno.test("service: a page that is not Qdrant's reads as unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: {
        type: "status_page",
        attributes: { company_name: "Someone Else", aggregate_state: "operational" },
      },
      included: [],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/self-identifies/.test(result.message!), result.message);
});

/** A broken status page says nothing about Qdrant. */
Deno.test("service: a failing status page is never down", async () => {
  for (const status of [404, 500, 503]) {
    const { ctx } = mockCtx([{ status, body: "nope" }]);
    assertEquals((await service.check!({}, ctx)).state, "unknown");
  }
});

Deno.test("service: an unreachable status host is unknown too", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof service.check>>[1];
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page with no resources is unknown", async () => {
  const { ctx } = mockCtx([page([])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no resources/.test(result.message!), result.message);
});

Deno.test("service: maps Better Stack's vocabulary", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("degraded"), "degraded");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus(undefined), "unknown");
  assertEquals(mapResourceStatus("something new"), "unknown");
});

Deno.test("service: component keys are slugs of the public names", () => {
  assertEquals(resourceKey({ attributes: { public_name: "AWS us-east-1" } }, 0), "aws-us-east-1");
  assertEquals(
    resourceKey({ attributes: { public_name: "Cloud API (extern)" } }, 0),
    "cloud-api-extern",
  );
  assertEquals(resourceKey({ id: "42" }, 0), "42");
  assertEquals(resourceKey({}, 3), "resource-3");
});

Deno.test("service: capping only ever lowers down", () => {
  assertEquals(capState("down"), "degraded");
  assertEquals(capState("degraded"), "degraded");
  assertEquals(capState("ok"), "ok");
  assertEquals(capState("unknown"), "unknown");
});

/**
 * The whole reason this check is not authoritative: it cannot tell a cloud
 * connection from a self-hosted one, and most Qdrant instances are self-hosted.
 */
Deno.test("service: is informational, unsigned, and names only the status host", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["status.qdrant.io"]);
});
