import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: signs with the x-api-key header the spec declares", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://console.jumpcloud.com/api/systemusers",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k1" } }, ctx);
  assertEquals(out.headers["x-api-key"], "k1");
  assertEquals(auth.apiKey, { in: "header", name: "x-api-key" });
});

/**
 * On an MSP key, a missing x-org-id does not fail — it acts on JumpCloud's
 * default organization, which is a real one.
 */
Deno.test("api-key: the org header is sent when set, and omitted when not", async () => {
  const withOrg = mockCtx();
  const a = await auth.sign!({
    request: { url: "x", method: "GET" as const, headers: {} as Record<string, string> },
    credential: { apiKey: "k1", orgId: " org1 " },
  }, withOrg.ctx);
  assertEquals(a.headers["x-org-id"], "org1");

  const without = mockCtx();
  const b = await auth.sign!({
    request: { url: "x", method: "GET" as const, headers: {} as Record<string, string> },
    credential: { apiKey: "k1", orgId: "" },
  }, without.ctx);
  assertEquals(b.headers["x-org-id"], undefined);
});

Deno.test("api-key: the key is a secret field with no default", () => {
  const secrets = auth.fields!.filter((f) => f.type === "secret").map((f) => f.key);
  assertEquals(secrets, ["apiKey"]);
  assertEquals(auth.fields!.find((f) => f.key === "apiKey")!.default, undefined);
});

/** A key belongs to one console; there is no endpoint that says which. */
Deno.test("api-key: the region is a required field offering all three consoles", () => {
  const region = auth.fields!.find((f) => f.key === "region")!;
  assertEquals(region.required, true);
  assertEquals(region.default, "us");
  assertEquals(
    (region.options as Array<{ value: string }>).map((o) => o.value),
    ["us", "eu", "in"],
  );
});

Deno.test("api-key: test probes the chosen region, not always the US one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }]);
  assertEquals(await auth.test!({ credential: { apiKey: "k", region: "eu" } } as never, ctx), {
    ok: true,
  });
  assertEquals(calls[0].url, "https://console.eu.jumpcloud.com/api/systemusers?limit=1");
  assertEquals(calls[0].headers["x-api-key"], "k");
});

/**
 * The measured trap: no key at all answers 302 to the login page rather than
 * 401, and following it would look like success.
 */
Deno.test("api-key: a redirect is reported as the missing credential it is", async () => {
  const { ctx, calls } = mockCtx([{ status: 302, headers: { location: "/login" }, body: "" }]);
  const result = await auth.test!({ credential: { apiKey: "k" } } as never, ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(result.ok, false);
  assert(result.message.includes("login page"), result.message);
  assertEquals(calls[0].redirect, "manual");
});

Deno.test("api-key: 401, 403 and anything else get their own messages", async () => {
  const unauthorized = mockCtx([{ status: 401, body: "" }]);
  const a = await auth.test!(
    { credential: { apiKey: "k", region: "in" } } as never,
    unauthorized.ctx,
  ) as { ok: boolean; message: string };
  assertEquals(a.ok, false);
  assert(a.message.includes("in region"), a.message);

  const forbidden = mockCtx([{ status: 403, body: "" }]);
  const b = await auth.test!({ credential: { apiKey: "k" } } as never, forbidden.ctx) as {
    message: string;
  };
  assert(b.message.includes("not permitted"), b.message);

  const other = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.test!({ credential: { apiKey: "k" } } as never, other.ctx), {
    ok: false,
    message: "JumpCloud returned 500",
  });
});

Deno.test("api-key: a missing key fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect publishes the region and org, never the key", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { results: [{ _id: "org1", displayName: "Acme" }] },
  }]);
  const display = await auth.afterConnect!(
    { credential: { apiKey: "supersecret", region: "eu" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { region: "eu", orgId: "org1", orgName: "Acme" });
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});

/** An explicitly chosen org must win over whatever the lookup returns first. */
Deno.test("api-key: an explicit org id is not overwritten by the lookup", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { results: [{ _id: "default-org", displayName: "Default" }] },
  }]);
  const display = await auth.afterConnect!(
    { credential: { apiKey: "k", region: "us", orgId: "chosen-org" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.orgId, "chosen-org");
});

Deno.test("api-key: a failed lookup still connects, with the region recorded", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(
    await auth.afterConnect!({ credential: { apiKey: "k", region: "in" } } as never, ctx),
    { region: "in", orgId: undefined },
  );
});
