import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";
import { API_VERSION } from "../../lib/client.ts";

const account = (type: string, name = "Acme Data") => ({
  status: 200,
  body: { code: "Success", data: { id: "acc_1", name, account_type: type } },
});

Deno.test("api-key: sign sends Basic auth and pins the Accept version", () => {
  const request = { url: "https://api.fivetran.com/v1/groups", method: "GET", headers: {} };
  const signed = auth.sign!(
    { request, credential: { apiKey: "k1", apiSecret: "s1" } },
    mockCtx().ctx,
  ) as { headers: Record<string, string> };
  assertEquals(atob(signed.headers["authorization"].slice(6)), "k1:s1");
  assertEquals(signed.headers["accept"], API_VERSION);
});

/** The plan is the difference between 500 and 20,000 requests an hour. */
Deno.test("api-key: test names a trial account and its tighter cap", async () => {
  const { ctx, calls } = mockCtx([account("Trial")]);
  const result = await auth.test!({ credential: { apiKey: "k1", apiSecret: "s1" } }, ctx);
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/account/info");
  assertEquals(result.ok, true);
  assert(/TRIAL/.test(result.message!), result.message);
  assert(/500 API requests an hour/.test(result.message!), result.message);
});

Deno.test("api-key: a paid account connects without the warning", async () => {
  const { ctx } = mockCtx([account("Enterprise")]);
  const result = await auth.test!({ credential: { apiKey: "k1", apiSecret: "s1" } }, ctx);
  assertEquals(result.ok, true);
  assert(result.message!.includes("Acme Data"), result.message);
  assert(!/TRIAL/.test(result.message!), result.message);
});

Deno.test("api-key: a rejected credential does not connect", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: "Unauthorized" } }]);
  const result = await auth.test!({ credential: { apiKey: "k1", apiSecret: "s1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/rejected/.test(result.message!), result.message);
});

/** The one failure whose message is otherwise baffling. */
Deno.test("api-key: a 406 is reported as the Accept header", async () => {
  const { ctx } = mockCtx([{ status: 406, body: "" }]);
  const result = await auth.test!({ credential: { apiKey: "k1", apiSecret: "s1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/Accept header/.test(result.message!), result.message);
});

Deno.test("api-key: any other failure reports the status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await auth.test!({ credential: { apiKey: "k1", apiSecret: "s1" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("503"), result.message);
});

Deno.test("api-key: a half-missing credential is refused before a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: { apiKey: "k1" } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

/** The account is public metadata; the key and secret never are. */
Deno.test("api-key: afterConnect records the account, not the credentials", async () => {
  const { ctx } = mockCtx([account("Enterprise")]);
  const display = await auth.afterConnect!(
    { credential: { apiKey: "k_secret", apiSecret: "s_secret" } },
    ctx,
  );
  assertEquals(display, { account: "Acme Data", accountType: "Enterprise" });
  assert(!JSON.stringify(display).includes("secret"));
});

Deno.test("api-key: afterConnect degrades quietly when the account cannot be read", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  assertEquals(
    await auth.afterConnect!({ credential: { apiKey: "k1", apiSecret: "s1" } }, ctx),
    {},
  );
});

Deno.test("api-key: is basic auth with two secret fields", () => {
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields!.map((f) => f.key), ["apiKey", "apiSecret"]);
  assert(auth.fields!.every((f) => f.type === "secret"));
});
