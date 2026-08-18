import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";

const display = { url: "https://mastodon.social", maxCharacters: 500 };
const server = (max = 500) => ({
  status: 200,
  body: {
    domain: "mastodon.social",
    version: "4.7.0",
    configuration: { statuses: { max_characters: max } },
  },
});

Deno.test("instance: probes the connection's own server, unauthenticated", async () => {
  const { ctx, calls } = mockCtx([server()], { display });
  const result = await instance.check!({}, ctx);
  assertEquals(calls[0].url, "https://mastodon.social/api/v2/instance");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
  assert(/4\.7\.0/.test(result.message!), result.message);
});

/**
 * A limit change is an admin editing a config file — nothing announces it, and
 * a lowered limit makes posts start failing.
 */
Deno.test("instance: a lowered character limit is degraded, and says what breaks", async () => {
  const { ctx } = mockCtx([server(280)], { display });
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/now allows 280/.test(result.message!), result.message);
  assert(/start being refused/.test(result.message!), result.message);
});

Deno.test("instance: a raised limit is reported as the harmless direction", async () => {
  const { ctx } = mockCtx([server(5000)], { display });
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/Longer posts are available/.test(result.message!), result.message);
});

Deno.test("instance: an unchanged limit is simply ok", async () => {
  const { ctx } = mockCtx([server(500)], { display });
  assertEquals((await instance.check!({}, ctx)).state, "ok");
});

Deno.test("instance: an unreachable or erroring server is down", async () => {
  const erroring = mockCtx([{ status: 503, body: "" }], { display });
  const result = await instance.check!({}, erroring.ctx);
  assertEquals(result.state, "down");
  assert(/one server,\s+not the network/.test(result.message!), result.message);

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
    connection: { display } as never,
  } as unknown as Parameters<NonNullable<typeof instance.check>>[1];
  assertEquals((await instance.check!({}, offline)).state, "down");
});

Deno.test("instance: an HTML body is degraded and named as a proxy", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html/>" }], { display });
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/proxy or a landing page/.test(result.message!), result.message);
});

Deno.test("instance: JSON that is not a Mastodon instance is degraded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { hello: "world" } }], { display });
  assertEquals((await instance.check!({}, ctx)).state, "degraded");
});

Deno.test("instance: a connection with no URL is unknown", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  assertEquals((await instance.check!({}, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

/** Server liveness and token validity are separate questions. */
Deno.test("instance: is unauthenticated by declaration", () => {
  assertEquals(instance.credential, "context");
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
});
