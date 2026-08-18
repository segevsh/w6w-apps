import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const credential = { apiKey: "key-1" };

/** `OAuth`, not `Bearer` — Statuspage's own convention. */
Deno.test("api-key: signs with the OAuth scheme word", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.statuspage.io/v1/pages",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential }, ctx);
  assertEquals(out.headers["authorization"], "OAuth key-1");
});

Deno.test("api-key: test lists the pages the key reaches", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "pg1", name: "Acme Status" }] }]);
  const out = await auth.test!({ credential }, ctx);
  assertEquals(out.ok, true);
  assert(out.message!.includes("Acme Status"), out.message);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages");
});

Deno.test("api-key: a bad key is named as such", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Could not authenticate" } }]);
  const out = await auth.test!({ credential }, ctx);
  assertEquals(out.ok, false);
  assert(/authenticate/.test(out.message!), out.message);
});

/** One request per second means the test itself can be rate limited. */
Deno.test("api-key: a rate-limited test says so rather than blaming the key", async () => {
  for (const status of [420, 429]) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    const out = await auth.test!({ credential }, ctx);
    assertEquals(out.ok, false);
    assert(/one request per second/.test(out.message!), out.message);
  }
});

Deno.test("api-key: afterConnect resolves the only page automatically", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{ id: "pg1", name: "Acme Status", subdomain: "acme" }],
  }]);
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.pageId, "pg1");
  assertEquals(display.pageName, "Acme Status");
  assertEquals(display.subdomain, "acme");
});

Deno.test("api-key: with several pages an explicit id wins", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{ id: "pg1", name: "Public" }, { id: "pg2", name: "Internal" }],
  }]);
  const display = await auth.afterConnect!(
    { credential: { ...credential, pageId: "pg2" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.pageId, "pg2");
  assertEquals(display.pageName, "Internal");
});

Deno.test("api-key: the key field is declared secret", () => {
  assertEquals(auth.fields!.find((f) => f.key === "apiKey")!.type, "secret");
});
