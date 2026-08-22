import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/node.ts";
import capacity from "../../health/capacity.ts";
import service from "../../health/service.ts";

const D = { display: { host: "https://search.internal:8108" } };
const run = (ctx: Parameters<NonNullable<typeof check.check>>[1]) => check.check!({}, ctx);

/** /health needs no key, which is what makes this check honest. */
Deno.test("node: a healthy node is ok, and the probe carries no key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }], D);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://search.internal:8108/health");
  assertEquals(calls[0].headers["x-typesense-api-key"], undefined);
  assertEquals(check.credential, "none");
  assertEquals(result.state, "ok");
});

/**
 * The failure worth naming: searches keep answering while writes stop, so the
 * index goes stale rather than the service going away.
 */
Deno.test("node: a resource error is degraded and says which resource", async () => {
  for (const error of ["OUT_OF_DISK", "OUT_OF_MEMORY"]) {
    const { ctx } = mockCtx([{ status: 200, body: { ok: true, resource_error: error } }], D);
    const result = await run(ctx);
    assertEquals(result.state, "degraded", error);
    assert(new RegExp(error).test(result.message!), result.message);
    assert(/WRITES STOP/.test(result.message!), result.message);
  }
});

Deno.test("node: ok:false is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { ok: false } }], D);
  assertEquals((await run(ctx)).state, "down");
});

/** The commonest setup mistake looks exactly like the server being down. */
Deno.test("node: an unreachable host names port 8108", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("connection refused")),
    log: () => {},
    connection: { display: { host: "https://search.internal:8108" } },
  } as unknown as Parameters<NonNullable<typeof check.check>>[1];
  const result = await run(ctx);
  assertEquals(result.state, "down");
  assert(/port 8108/.test(result.message!), result.message);
});

Deno.test("node: a non-JSON body reads as a proxy rather than an outage", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>" }], D);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/proxy or a wrong port/.test(result.message!), result.message);
});

Deno.test("node: no recorded host is unknown, not down", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  assertEquals((await run(ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

/** Typesense serves from RAM, so the quota check is real rather than absent. */
Deno.test("capacity: reads the memory and disk shares", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      system_memory_used_bytes: "4000000000",
      system_memory_total_bytes: "8000000000",
      system_disk_used_bytes: "10000000000",
      system_disk_total_bytes: "100000000000",
    },
  }], D);
  const result = await capacity.check!({}, ctx);
  assertEquals(calls[0].url, "https://search.internal:8108/metrics.json");
  assertEquals(result.state, "ok");
  assert(/memory 50%/.test(result.message!), result.message);
  assert(/disk 10%/.test(result.message!), result.message);
});

Deno.test("capacity: at the memory ceiling it says writes stop and searches do not", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      system_memory_used_bytes: "7500000000",
      system_memory_total_bytes: "8000000000",
      system_disk_used_bytes: "1",
      system_disk_total_bytes: "100",
    },
  }], D);
  const result = await capacity.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/refuses WRITES/.test(result.message!), result.message);
});

Deno.test("capacity: a full disk is degraded for its own reason", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      system_memory_used_bytes: "1",
      system_memory_total_bytes: "100",
      system_disk_used_bytes: "95",
      system_disk_total_bytes: "100",
    },
  }], D);
  const result = await capacity.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/nothing about search performance degrades first/.test(result.message!), result.message);
});

/** Authenticated, so a bad key and an outage look the same here. */
Deno.test("capacity: a rejected credential is unknown and defers to the node check", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Forbidden" } }], D);
  const result = await capacity.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/The `node` check is the one that decides/.test(result.message!), result.message);
});

/** Typesense is mostly self-hosted, so the Cloud feed cannot be fatal. */
Deno.test("service: reads the Cloud feed and is only informational", async () => {
  assertEquals(service.severity, "informational");
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      components: [
        { name: "Management Console", status: "OPERATIONAL" },
        { name: "Cluster Regions", status: "OPERATIONAL" },
      ],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://typesense.instatus.com/v2/components.json");
  assertEquals(result.state, "ok");
  assert(/says nothing about a self-hosted node/.test(result.message!), result.message);
});

/** A console incident is not the search path. */
Deno.test("service: a console-only incident says clusters keep serving", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        { name: "Management Console", status: "MAJOROUTAGE" },
        { name: "Cluster Regions", status: "OPERATIONAL" },
      ],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/clusters keep serving searches/.test(result.message!), result.message);
  assert(/Typesense Cloud only/.test(result.message!), result.message);
});
