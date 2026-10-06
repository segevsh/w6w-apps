import { assert, assertEquals } from "@std/assert";
import auth, { probeRequest } from "../../auth/api-token.ts";
import { mockCtx } from "../_helpers.ts";

const sign = async (url: string, token: unknown) => {
  const { ctx } = mockCtx();
  return await auth.sign!({
    request: { url, method: "GET", headers: {} },
    credential: { token },
  }, ctx);
};

Deno.test("api-token sign: token query parameter on api, kg and nl hosts", async () => {
  for (
    const url of [
      "https://api.diffbot.com/v3/analyze?url=https%3A%2F%2Fe.com",
      "https://kg.diffbot.com/kg/v3/dql",
      "https://nl.diffbot.com/v1/",
    ]
  ) {
    const out = await sign(url, "  abc123 ");
    assertEquals(new URL(out.url).searchParams.get("token"), "abc123");
    assertEquals(out.headers["authorization"], undefined);
  }
  const keep = await sign("https://api.diffbot.com/v3/analyze?url=x", "t");
  assertEquals(new URL(keep.url).searchParams.get("url"), "x");
});

Deno.test("api-token sign: llm host takes a bearer header, never a query parameter", async () => {
  const out = await sign("https://llm.diffbot.com/api/v1/web_search", " tok ");
  assertEquals(out.headers["authorization"], "Bearer tok");
  assertEquals(out.url.includes("token"), false);
});

Deno.test("api-token test: 2xx is accepted and the probe is a signed KG search", async () => {
  const { ctx, calls } = mockCtx([{ body: { hits: 0, data: [] } }]);
  const out = await auth.test!({ credential: { token: "SECRETTOKEN" } }, ctx);
  assertEquals(out.ok, true);
  const u = new URL(calls[0].url);
  assertEquals(u.hostname, "kg.diffbot.com");
  assertEquals(u.searchParams.get("token"), "SECRETTOKEN");
  assertEquals(u.searchParams.get("query"), new URL(probeRequest().url).searchParams.get("query"));
});

Deno.test("api-token test: a 400 DQL parse-error envelope still proves the token", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: true, message: "parse error" } }]);
  assertEquals((await auth.test!({ credential: { token: "t" } }, ctx)).ok, true);
});

Deno.test("api-token test: 401/403 rejected, 429 throttled, other statuses reported; token never echoed", async () => {
  for (
    const [status, body, needle] of [
      [401, { code: 401, message: "Unauthorized. Incorrect token." }, "rejected"],
      [403, { message: "Forbidden" }, "rejected"],
      [429, { message: "slow down" }, "not rejected"],
      [500, { message: "boom" }, "HTTP 500"],
      [400, { message: "bad but not a DQL envelope" }, "HTTP 400"],
    ] as const
  ) {
    const { ctx } = mockCtx([{ status, body }]);
    const out = await auth.test!({ credential: { token: "SECRETTOKEN" } }, ctx);
    assertEquals(out.ok, false, String(status));
    assert(out.message!.includes(needle), `${status}: ${out.message}`);
    assert(!out.message!.includes("SECRETTOKEN"));
  }
});

Deno.test("api-token test: a missing or blank token fails without any request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: {} }, ctx)).ok, false);
  assertEquals((await auth.test!({ credential: { token: "  " } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});
