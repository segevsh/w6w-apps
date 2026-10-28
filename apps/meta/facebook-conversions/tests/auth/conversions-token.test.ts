import { assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/conversions-token.ts";

Deno.test("conversions-token: declares a bearer method with a secret token and a dataset id", () => {
  assertEquals(auth.key, "conversions-token");
  assertEquals(auth.type, "bearer");
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["accessToken", "datasetId"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[1].required, true);
});

Deno.test("conversions-token: sign stamps the bearer credential", () => {
  const request: SignableRequest = {
    url: "https://graph.facebook.com/v25.0/1/events",
    method: "POST",
    headers: {},
  };
  const signed = auth.sign!(
    { request, credential: { accessToken: "tok-1", datasetId: "1" } },
    mockCtx().ctx,
  ) as SignableRequest;
  assertEquals(signed.headers["authorization"], "Bearer tok-1");
});

Deno.test("conversions-token: test probes /me, the one call a dataset token can always make", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  const result = await auth.test(
    { credential: { accessToken: "tok-1", datasetId: "123" } },
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/me");
});

Deno.test("conversions-token: test fails without making a call when a field is missing", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(
    await auth.test({ credential: { datasetId: "123" } }, ctx),
    { ok: false, message: "credential missing accessToken" },
  );
  assertEquals(
    await auth.test({ credential: { accessToken: "tok-1" } }, ctx),
    { ok: false, message: "credential missing datasetId" },
  );
  assertEquals(calls.length, 0);
});

Deno.test("conversions-token: test reports a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: { message: "bad token" } } }]);
  const result = await auth.test(
    { credential: { accessToken: "nope", datasetId: "123" } },
    ctx,
  );
  assertEquals(result, { ok: false, message: "Meta returned 401" });
});

Deno.test("conversions-token: afterConnect stamps the dataset id and name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "123", name: "Storefront" } }]);
  const display = await auth.afterConnect!(
    { credential: { accessToken: "tok-1", datasetId: "123" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/123");
  assertEquals(display, { dataset: { id: "123", name: "Storefront" } });
});

Deno.test("conversions-token: afterConnect keeps the dataset id when the name lookup is denied", async () => {
  // An Events Manager token has no ads_read, so this 403 is the NORMAL case —
  // losing the id here would break every action on the connection.
  const { ctx } = mockCtx([{ status: 403, body: { error: { message: "needs ads_read" } } }]);
  const display = await auth.afterConnect!(
    { credential: { accessToken: "tok-1", datasetId: "123" } },
    ctx,
  );
  assertEquals(display, { dataset: { id: "123" } });
});

Deno.test("conversions-token: afterConnect makes no call without a dataset id", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {});
  assertEquals(calls.length, 0);
});
