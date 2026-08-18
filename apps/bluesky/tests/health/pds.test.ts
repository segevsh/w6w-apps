import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import pds from "../../health/pds.ts";

const display = { service: "https://bsky.social", did: "did:plc:me" };
const described = {
  status: 200,
  body: { did: "did:web:bsky.social", availableUserDomains: [".bsky.social"] },
};

Deno.test("pds: probes the connection's own server, unauthenticated", async () => {
  const { ctx, calls } = mockCtx([described], { display });
  const result = await pds.check!({}, ctx);
  assertEquals(calls[0].url, "https://bsky.social/xrpc/com.atproto.server.describeServer");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
});

/** The AT Protocol is federated — "is Bluesky up" has no single answer. */
Deno.test("pds: a self-hosted server is probed at its own host", async () => {
  const { ctx, calls } = mockCtx([described], { display: { service: "https://pds.example.com" } });
  await pds.check!({}, ctx);
  assert(calls[0].url.startsWith("https://pds.example.com/"), calls[0].url);
});

Deno.test("pds: an unreachable or erroring server is down", async () => {
  const erroring = mockCtx([{ status: 503, body: "nope" }], { display });
  assertEquals((await pds.check!({}, erroring.ctx)).state, "down");

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
    connection: { display } as never,
  } as unknown as Parameters<NonNullable<typeof pds.check>>[1];
  assertEquals((await pds.check!({}, offline)).state, "down");
});

/** Something answering that is not the PDS is worth distinguishing from silence. */
Deno.test("pds: an HTML body means something is in front of the server", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>hello</html>" }], { display });
  const result = await pds.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/in front of the PDS/.test(result.message!), result.message);
});

Deno.test("pds: JSON that is not an AT Protocol server is degraded, not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { hello: "world" } }], { display });
  assertEquals((await pds.check!({}, ctx)).state, "degraded");
});

/** The service field has a default, so the failure case is a stored value that will not parse. */
Deno.test("pds: an unparseable stored server is unknown, not down", async () => {
  const { ctx, calls } = mockCtx([], { display: { service: "not a url" } });
  assertEquals((await pds.check!({}, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

/**
 * Separating liveness from the session is the point: a routine token expiry
 * must not read as the server having gone.
 */
Deno.test("pds: is unauthenticated by declaration", () => {
  assertEquals(pds.credential, "context");
  assertEquals(pds.kind, "dependency");
  assertEquals(pds.scope, "connection");
});
