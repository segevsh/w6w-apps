import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

/** The key IS the header value — no scheme word. */
Deno.test("api-key: signs with the bare key, not Bearer", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://app.documenso.com/api/v2/envelope",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "api_abc" } }, ctx);
  assertEquals(out.headers["authorization"], "api_abc");
  assertEquals(auth.apiKey, { in: "header", name: "Authorization" });
});

Deno.test("api-key: only the key is required; the instance defaults to the cloud", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key);
  assertEquals(required, ["apiKey"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["apiKey"]);
});

Deno.test("api-key: test probes the envelope collection on the chosen instance", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  assertEquals(
    await auth.test!(
      { credential: { apiKey: "k", instanceUrl: "sign.example.com" } } as never,
      ctx,
    ),
    { ok: true },
  );
  assertEquals(calls[0].url, "https://sign.example.com/api/v2/envelope?perPage=1");
});

/** A missing key is a 400 with a Zod header error, not a 401. */
Deno.test("api-key: the header-validation 400 is reported as a missing credential", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Request validation failed", headerErrors: { issues: [] } },
  }]);
  const result = await auth.test!({ credential: { apiKey: "k" } } as never, ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(result.ok, false);
  assert(result.message.includes("saw no Authorization header"), result.message);
});

Deno.test("api-key: another 400 is reported with its body, not mislabelled", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Something else" } }]);
  const result = await auth.test!({ credential: { apiKey: "k" } } as never, ctx) as {
    message: string;
  };
  assert(result.message.includes("Something else"), result.message);
});

/** A 404 means the instance predates the Envelope API, or the URL is wrong. */
Deno.test("api-key: a 404 names both of its causes", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await auth.test!({ credential: { apiKey: "k" } } as never, ctx) as {
    message: string;
  };
  assert(result.message.includes("predate the Envelope API"), result.message);
});

Deno.test("api-key: 401 and 403 both read as a rejected key", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    const result = await auth.test!({ credential: { apiKey: "k" } } as never, ctx) as {
      message: string;
    };
    assert(result.message.includes("rejected the API key"), result.message);
  }
});

Deno.test("api-key: a missing key fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect records the instance, never the key", async () => {
  const display = await auth.afterConnect!(
    { credential: { apiKey: "supersecret", instanceUrl: "sign.example.com/" } } as never,
    null as never,
  ) as Record<string, unknown>;
  assertEquals(display, { baseUrl: "https://sign.example.com" });
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});

Deno.test("api-key: with no instance the connection records the cloud", async () => {
  assertEquals(
    await auth.afterConnect!({ credential: { apiKey: "k" } } as never, null as never),
    { baseUrl: "https://app.documenso.com" },
  );
});
