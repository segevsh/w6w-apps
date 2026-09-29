import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: signs with the X-Auth-Token header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.docuseal.com/templates",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "abc123" } }, ctx);
  assertEquals(out.headers["x-auth-token"], "abc123");
  assertEquals(auth.apiKey, { in: "header", name: "X-Auth-Token" });
});

Deno.test("api-key: both region and apiKey are required; only apiKey is a secret", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["apiKey", "region"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["apiKey"]);
  const region = auth.fields!.find((f) => f.key === "region")!;
  assertEquals(region.default, "global");
  assertEquals(
    (region.options as Array<{ value: string }>).map((o) => o.value).sort(),
    ["eu", "global"],
  );
});

Deno.test("api-key: test probes /templates on the region's own host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], pagination: { count: 0 } } }]);
  assertEquals(
    await auth.test!({ credential: { apiKey: "k", region: "eu" } } as never, ctx),
    { ok: true },
  );
  assertEquals(calls[0].url, "https://api.docuseal.eu/templates?limit=1");
  assertEquals(calls[0].headers["x-auth-token"], "k");
});

Deno.test("api-key: a missing key fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

/**
 * DocuSeal answers the same body whether the header is missing or wrong —
 * classification comes from that body, never the status alone, and the
 * message never echoes the key back.
 */
Deno.test("api-key: a rejected key is classified from the vendor's own error body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Not authenticated" } }]);
  const result = await auth.test!({ credential: { apiKey: "wrong" } } as never, ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(result.ok, false);
  assert(result.message.includes("Not authenticated"), result.message);
  assert(!result.message.includes("wrong"), "the credential must never be echoed back");
});

Deno.test("api-key: defaults to the global host when no region is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], pagination: {} } }]);
  await auth.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(new URL(calls[0].url).host, "api.docuseal.com");
});

Deno.test("api-key: afterConnect records the region, never the key", async () => {
  const display = await auth.afterConnect!(
    { credential: { apiKey: "supersecret", region: "eu" } } as never,
    null as never,
  ) as Record<string, unknown>;
  assertEquals(display, { region: "eu" });
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});

Deno.test("api-key: with no region the connection records global", async () => {
  assertEquals(
    await auth.afterConnect!({ credential: { apiKey: "k" } } as never, null as never),
    { region: "global" },
  );
});
