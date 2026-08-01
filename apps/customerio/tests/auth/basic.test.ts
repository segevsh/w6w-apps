import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/basic.ts";

Deno.test("basic: fields are siteId, apiKey (secret) and region (select, defaults us)", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  assertEquals(keys, ["siteId", "apiKey", "region"]);
  assertEquals(auth.fields?.find((f) => f.key === "siteId")?.required, true);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.required, true);
  const region = auth.fields?.find((f) => f.key === "region");
  assertEquals(region?.type, "select");
  assertEquals(region?.default, "us");
});

Deno.test("basic: sign encodes siteId:apiKey as a Basic header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://track.customer.io/api/v1/customers/u1",
    method: "PUT",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { siteId: "site_123", apiKey: "key_abc" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${btoa("site_123:key_abc")}`);
});

Deno.test("basic: test rejects a credential missing siteId or apiKey, without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing siteId or apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("basic: test PUTs a minimal identify call to the US host by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  assertEquals(
    await auth.test({ credential: { siteId: "site_123", apiKey: "key_abc" } }, ctx),
    { ok: true },
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://track.customer.io/api/v1/customers/w6w-connection-test");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("site_123:key_abc")}`);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("basic: test PUTs to the EU host when region is eu", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await auth.test({ credential: { siteId: "s", apiKey: "k", region: "eu" } }, ctx);
  assertEquals(calls[0].url, "https://track-eu.customer.io/api/v1/customers/w6w-connection-test");
});

Deno.test("basic: test surfaces a non-2xx as a failed check", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.test({ credential: { siteId: "s", apiKey: "bad" } }, ctx), {
    ok: false,
    message: "Customer.io returned 401",
  });
});

Deno.test("basic: afterConnect echoes region, normalizing anything but eu to us", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: { region: "eu" } }, ctx), { region: "eu" });
  assertEquals(await auth.afterConnect!({ credential: { region: "us" } }, ctx), { region: "us" });
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), { region: "us" });
});
