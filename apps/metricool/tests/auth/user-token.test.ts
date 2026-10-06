import { assert, assertEquals } from "@std/assert";
import userToken, { authHeaders, PROBE_PATH } from "../../auth/user-token.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const CRED = { userToken: "unitTestFixtureNotARealToken", userId: "4242" };
const REJECTION = {
  status: "UNAUTHORIZED",
  code: "401",
  title: "Unauthorized",
  detail: "Authentication required",
};

Deno.test("user-token: sign sets X-Mc-Auth and merges userId into an existing query", () => {
  const request = {
    method: "GET",
    url: "https://app.metricool.com/api/v2/scheduler/posts?start=a&blogId=9",
    headers: {} as Record<string, string>,
  };
  const signed = userToken.sign!({ request, credential: CRED }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["x-mc-auth"], CRED.userToken);
  assertEquals(queryOf(signed.url), { start: "a", blogId: "9", userId: "4242" });
  assert(!signed.url.includes(CRED.userToken));
});

Deno.test("user-token: sign overwrites rather than duplicates a userId", () => {
  const request = {
    method: "GET",
    url: "https://app.metricool.com/api/v2/x?userId=1",
    headers: {} as Record<string, string>,
  };
  const signed = userToken.sign!({ request, credential: CRED }, {} as never) as { url: string };
  assertEquals(new URL(signed.url).searchParams.getAll("userId"), ["4242"]);
});

Deno.test("user-token: authHeaders trims the token", () => {
  assertEquals(authHeaders({ userToken: " abc " }), { "x-mc-auth": "abc" });
});

Deno.test("user-token: test passes on the brands envelope and signs the probe", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1, label: "Acme" }]) }]);
  const out = await userToken.test!({ credential: CRED }, ctx);
  assertEquals(out, { ok: true });
  assertEquals(pathOf(calls[0].url), `/api${PROBE_PATH}`);
  assertEquals(calls[0].headers["x-mc-auth"], CRED.userToken);
  assertEquals(queryOf(calls[0].url).userId, "4242");
});

Deno.test("user-token: test classifies the vendor's UNAUTHORIZED body as a rejection", async () => {
  const { ctx } = mockCtx([{ status: 401, body: REJECTION }]);
  const out = await userToken.test!({ credential: CRED }, ctx);
  assertEquals(out.ok, false);
  assert(/rejected/i.test(out.message ?? ""));
});

Deno.test("user-token: a 200 without the data array is not a pass", async () => {
  const { ctx } = mockCtx([{ body: "<html></html>", headers: { "content-type": "text/html" } }]);
  const out = await userToken.test!({ credential: CRED }, ctx);
  assertEquals(out.ok, false);
});

Deno.test("user-token: other failures carry the vendor detail and status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { detail: "boom" } }]);
  const out = await userToken.test!({ credential: CRED }, ctx);
  assertEquals(out.ok, false);
  assert((out.message ?? "").includes("500") && (out.message ?? "").includes("boom"));
});

Deno.test("user-token: test refuses a missing token or userId without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await userToken.test!({ credential: { userId: "1" } }, ctx)).ok, false);
  assertEquals((await userToken.test!({ credential: { userToken: "t" } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});
