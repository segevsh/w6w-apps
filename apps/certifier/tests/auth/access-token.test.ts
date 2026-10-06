import { assertEquals } from "@std/assert";
import accessToken, { authHeaders } from "../../auth/access-token.ts";
import { errorBody, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("auth: is a bearer method with one secret field", () => {
  assertEquals(accessToken.type, "bearer");
  assertEquals(accessToken.fields?.map((f) => [f.key, f.type]), [["accessToken", "secret"]]);
});

Deno.test("auth: sign stamps the bearer token and the required version header", async () => {
  const req = {
    url: "https://api.certifier.io/v1/groups",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await accessToken.sign!(
    { request: req, credential: { accessToken: "tok" } } as never,
    undefined as never,
  ) as typeof req;
  assertEquals(out.headers["authorization"], "Bearer tok");
  assertEquals(out.headers["certifier-version"], "2022-10-26");
  assertEquals(authHeaders({}).authorization, "Bearer ");
});

Deno.test("auth: test succeeds on a documented data page via GET /v1/groups?limit=1", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  const res = await accessToken.test!({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(res.ok, true);
  assertEquals(pathOf(calls[0].url), "/v1/groups");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
  assertEquals(calls[0].headers["certifier-version"], "2022-10-26");
});

Deno.test("auth: a 200 that is not a data page is not a pass", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  assertEquals(
    (await accessToken.test!({ credential: { accessToken: "t" } } as never, ctx)).ok,
    false,
  );
});

Deno.test("auth: classifies 401, 403, 402 and bad version by body", async () => {
  for (
    const [status, code, needle] of [
      [401, "unauthorized", "rejected the access token"],
      [403, "forbidden", "403 forbidden"],
      [402, "payment_required", "does not include API access"],
      [400, "invalid_version", "invalid_version"],
    ] as const
  ) {
    const { ctx } = mockCtx([{ status, body: errorBody(code, "x") }]);
    const res = await accessToken.test!({ credential: { accessToken: "t" } } as never, ctx);
    assertEquals(res.ok, false);
    assertEquals(res.message?.includes(needle), true, `${status}: ${res.message}`);
  }
});

Deno.test("auth: a missing token fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await accessToken.test!({ credential: {} } as never, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth: an error message never echoes the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("unauthorized", "Unauthorized") }]);
  const res = await accessToken.test!(
    { credential: { accessToken: "SECRET-TOKEN" } } as never,
    ctx,
  );
  assertEquals(JSON.stringify(res).includes("SECRET-TOKEN"), false);
});
