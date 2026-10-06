import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const KEY = "wf_unit_test_fixture_not_a_real_key";

Deno.test("api-key: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://workflowy.com/api/v1/nodes",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assert(!signed.url.includes(KEY));
  assertEquals(authHeaders({ apiKey: KEY }).authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: test passes on 200 and probes /targets with the bearer header", async () => {
  const { ctx, calls } = mockCtx([{ body: { targets: [] } }]);
  assertEquals(await apiKey.test!({ credential: { apiKey: KEY } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), `/api/v1${PROBE_PATH}`);
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: test rejects a missing key without calling the network", async () => {
  const { ctx, calls } = mockCtx();
  const r = await apiKey.test!({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test surfaces the vendor's 401 body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Credentials, try again." } }]);
  const r = await apiKey.test!({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("Invalid Credentials"));
});

Deno.test("api-key: test reports other statuses without claiming bad credentials", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "down" }]);
  const r = await apiKey.test!({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("503"));
});
