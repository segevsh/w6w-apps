import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: fields are apiKey (secret) and region (select, defaults us)", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  assertEquals(keys, ["apiKey", "region"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  const region = auth.fields?.find((f) => f.key === "region");
  assertEquals(region?.type, "select");
  assertEquals(region?.default, "us");
});

Deno.test("api-key: sign uses the literal username `api`, never the caller's identity", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.mailgun.net/v3/mg.example.com/messages",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "key-123", region: "us" } }, ctx);
  assertEquals(out.headers["authorization"], `Basic ${btoa("api:key-123")}`);
});

Deno.test("api-key: test rejects a credential with no apiKey, without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { region: "us" } }, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes the US host by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  assertEquals(await auth.test({ credential: { apiKey: "k" } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.mailgun.net/v4/domains?limit=1");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("api:k")}`);
});

Deno.test("api-key: test probes the EU host when region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await auth.test({ credential: { apiKey: "k", region: "eu" } }, ctx);
  assertEquals(calls[0].url, "https://api.eu.mailgun.net/v4/domains?limit=1");
});

Deno.test("api-key: test surfaces a non-2xx as a failed check", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.test({ credential: { apiKey: "bad" } }, ctx), {
    ok: false,
    message: "Mailgun returned 401",
  });
});

Deno.test("api-key: afterConnect echoes the region, normalizing anything but eu to us", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: { region: "eu" } }, ctx), { region: "eu" });
  assertEquals(await auth.afterConnect!({ credential: { region: "us" } }, ctx), { region: "us" });
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), { region: "us" });
});
