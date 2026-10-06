import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("auth: declares an apiKey method with a secret field and X-Api-Key header", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.name, "X-Api-Key");
  assertEquals(auth.fields![0].type, "secret");
});

Deno.test("auth: sign stamps x-api-key and nothing else", async () => {
  const req = {
    url: "https://api.peopledatalabs.com/v5/person/enrich",
    method: "GET",
    headers: {},
  } as never;
  const out = await auth.sign!(
    { request: req, credential: { apiKey: "k1" } } as never,
    {} as never,
  );
  assertEquals((out as { headers: Record<string, string> }).headers, { "x-api-key": "k1" });
});

Deno.test("auth.test: a suggestions array is a live key, probed with GET /v5/autocomplete", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: 200, data: [{ name: "engineer" }] } }]);
  const r = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v5/autocomplete");
  assertEquals(url.search, "?field=title&size=1");
  assertEquals(calls[0].headers["x-api-key"], "k");
});

Deno.test("auth.test: authentication_error is rejected from the body, array or string type", async () => {
  const arr = mockCtx([{
    status: 401,
    body: {
      status: 401,
      error: {
        type: ["authentication_error"],
        message: "Your request contained an invalid api key",
      },
    },
  }]);
  const r1 = await auth.test!({ credential: { apiKey: "bad" } }, arr.ctx);
  assertEquals(r1.ok, false);
  assert(r1.message!.includes("invalid api key"));
  const str = mockCtx([{
    status: 401,
    body: { status: 401, error: { type: "authentication_error", message: "no" } },
  }]);
  assertEquals((await auth.test!({ credential: { apiKey: "bad" } }, str.ctx)).ok, false);
});

Deno.test("auth.test: out-of-credits (402) and rate-limited (429) keys are still recognised keys", async () => {
  const pay = mockCtx([{
    status: 402,
    body: { status: 402, error: { type: ["payment_required"], message: "x" } },
  }]);
  assertEquals((await auth.test!({ credential: { apiKey: "k" } }, pay.ctx)).ok, true);
  const rate = mockCtx([{
    status: 429,
    body: { status: 429, error: { type: "rate_limit_error", message: "x" } },
  }]);
  assertEquals((await auth.test!({ credential: { apiKey: "k" } }, rate.ctx)).ok, true);
});

Deno.test("auth.test: a 200 without data, a 5xx, an HTML 4xx, no key and a network error all fail", async () => {
  const shape = mockCtx([{ body: { hello: "world" } }]);
  assert(
    (await auth.test!({ credential: { apiKey: "k" } }, shape.ctx)).message!.includes(
      "no suggestions",
    ),
  );
  const five = mockCtx([{
    status: 500,
    body: { status: 500, error: { type: ["api_error"], message: "boom" } },
  }]);
  assert(
    (await auth.test!({ credential: { apiKey: "k" } }, five.ctx)).message!.includes(
      "erroring (500)",
    ),
  );
  const html = mockCtx([{ status: 403, body: "<html>blocked</html>" }]);
  assert(
    (await auth.test!({ credential: { apiKey: "k" } }, html.ctx)).message!.includes(
      "non-error body",
    ),
  );
  const missing = await auth.test!({ credential: {} }, mockCtx([]).ctx);
  assertEquals(missing.ok, false);
  assert(missing.message!.includes("missing apiKey"));
  const down = await auth.test!({ credential: { apiKey: "k" } }, mockCtx([]).ctx);
  assertEquals(down.ok, false);
  assert(down.message!.includes("could not reach"));
});
