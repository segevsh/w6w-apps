import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/personal-api-key.ts";

Deno.test("personal-api-key: fields are personalApiKey (secret), region (select, defaults us), projectId", () => {
  assertEquals(auth.key, "personal-api-key");
  assertEquals(auth.type, "bearer");
  const keys = auth.fields?.map((f) => f.key);
  assertEquals(keys, ["personalApiKey", "region", "projectId"]);
  assertEquals(auth.fields?.find((f) => f.key === "personalApiKey")?.type, "secret");
  const region = auth.fields?.find((f) => f.key === "region");
  assertEquals(region?.type, "select");
  assertEquals(region?.default, "us");
  assertEquals(auth.fields?.find((f) => f.key === "projectId")?.required, true);
});

Deno.test("personal-api-key: sign stamps Authorization: Bearer <personalApiKey>", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://us.posthog.com/api/projects/1/persons/",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { personalApiKey: "phx_abc", region: "us", projectId: "1" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer phx_abc");
});

Deno.test("personal-api-key: test rejects a credential with no personalApiKey, without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { region: "us" } }, ctx), {
    ok: false,
    message: "credential missing personalApiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("personal-api-key: test probes GET /api/users/@me/ on the US host by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { uuid: "u1" } }]);
  assertEquals(await auth.test({ credential: { personalApiKey: "k" } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://us.posthog.com/api/users/@me/");
  assertEquals(calls[0].headers["authorization"], "Bearer k");
});

Deno.test("personal-api-key: test probes the EU host when region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { uuid: "u1" } }]);
  await auth.test({ credential: { personalApiKey: "k", region: "eu" } }, ctx);
  assertEquals(calls[0].url, "https://eu.posthog.com/api/users/@me/");
});

Deno.test("personal-api-key: test surfaces a non-2xx as a failed check", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.test({ credential: { personalApiKey: "bad" } }, ctx), {
    ok: false,
    message: "PostHog returned 401",
  });
});

Deno.test("personal-api-key: afterConnect echoes region (normalized) and projectId", async () => {
  const { ctx } = mockCtx();
  assertEquals(
    await auth.afterConnect!({ credential: { region: "eu", projectId: "42" } }, ctx),
    { region: "eu", projectId: "42" },
  );
  assertEquals(
    await auth.afterConnect!({ credential: { projectId: "1" } }, ctx),
    { region: "us", projectId: "1" },
  );
});
