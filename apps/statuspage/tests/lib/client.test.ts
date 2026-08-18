import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  COMPONENT_STATUSES,
  describeError,
  INCIDENT_IMPACTS,
  INCIDENT_STATUSES,
  StatuspageClient,
} from "../../lib/client.ts";

const conn = { display: { pageId: "pg1", pageName: "Acme Status" } };

Deno.test("client: calls the v1 API host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await new StatuspageClient(ctx).request("/pages");
  assertEquals(new URL(calls[0].url).host, "api.statuspage.io");
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages");
});

Deno.test("client: pageFor prefers an override, then the connection", () => {
  const { ctx } = mockCtx([], conn);
  const client = new StatuspageClient(ctx);
  assertEquals(client.pageFor("other"), "other");
  assertEquals(client.pageFor(""), "pg1");

  const { ctx: bare } = mockCtx([], { display: {} });
  assertThrows(() => new StatuspageClient(bare).pageFor(), Error, "page-list");
});

/** 420 is Statuspage's own; a generic client treats it as unknown. */
Deno.test("client: both rate-limit status codes name the one-per-second limit", async () => {
  for (const status of [420, 429]) {
    const { ctx } = mockCtx([{ status, body: "" }], conn);
    const err = await assertRejects(async () => await new StatuspageClient(ctx).request("/pages"));
    assert(/ONE request per second/.test(String(err)), `${status}: ${err}`);
  }
});

Deno.test("client: a validation error surfaces the field tree", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { error: { name: ["can't be blank"] } } }], conn);
  const err = await assertRejects(async () => await new StatuspageClient(ctx).request("/pages"));
  assert(String(err).includes("can't be blank"), String(err));
});

Deno.test("describeError: an authentication failure passes its message through", () => {
  assertEquals(
    describeError(401, JSON.stringify({ error: "Could not authenticate" })),
    "Could not authenticate",
  );
});

/** These are the same strings this pack's health checks map FROM. */
Deno.test("the vocabularies match Statuspage's published documents", () => {
  assertEquals(COMPONENT_STATUSES.map((s) => s.value), [
    "operational",
    "degraded_performance",
    "partial_outage",
    "major_outage",
    "under_maintenance",
  ]);
  assertEquals(INCIDENT_STATUSES.map((s) => s.value), [
    "investigating",
    "identified",
    "monitoring",
    "resolved",
  ]);
  assertEquals(INCIDENT_IMPACTS.map((s) => s.value), ["none", "minor", "major", "critical"]);
});

Deno.test("client: paging stops on a short page", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: Array.from({ length: 100 }, (_, i) => ({ id: `c${i}` })) },
    { status: 200, body: [{ id: "last" }] },
  ], conn);
  const all = await new StatuspageClient(ctx).requestAll("/pages/pg1/components");
  assertEquals(all.length, 101);
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});
