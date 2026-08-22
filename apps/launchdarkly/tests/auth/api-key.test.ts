import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

/** The token IS the header value — no scheme word at all. */
Deno.test("api-key: signs with the bare token, not Bearer", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://app.launchdarkly.com/api/v2/projects",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "api-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "api-abc");
  assert(!out.headers["authorization"].startsWith("Bearer"), "LaunchDarkly takes no scheme word");
  assertEquals(auth.apiKey, { in: "header", name: "Authorization" });
});

Deno.test("api-key: the token and instance are required, the defaults are not", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["apiKey", "instance"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["apiKey"]);
});

Deno.test("api-key: both instances are offered, commercial by default", () => {
  const instance = auth.fields!.find((f) => f.key === "instance")!;
  assertEquals(instance.default, "commercial");
  assertEquals(
    (instance.options as Array<{ value: string }>).map((o) => o.value),
    ["commercial", "federal"],
  );
});

Deno.test("api-key: test probes the chosen instance", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }]);
  assertEquals(
    await auth.test!({ credential: { apiKey: "k", instance: "federal" } } as never, ctx),
    { ok: true },
  );
  assertEquals(calls[0].url, "https://app.launchdarkly.us/api/v2/projects?limit=1");
  assertEquals(calls[0].headers["authorization"], "k");
});

/** A 401 could be a wrong token, a wrong instance, or a Bearer prefix. */
Deno.test("api-key: the 401 message names all three causes", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: "unauthorized" } }]);
  const result = await auth.test!(
    { credential: { apiKey: "k", instance: "commercial" } } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(result.ok, false);
  assert(result.message.includes("commercial"), result.message);
  assert(result.message.includes("Bearer"), result.message);
});

Deno.test("api-key: a 403 is a role problem, not a bad token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  const result = await auth.test!({ credential: { apiKey: "k" } } as never, ctx) as {
    message: string;
  };
  assert(result.message.includes("role"), result.message);
});

Deno.test("api-key: a missing token fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect publishes the instance and defaults, never the token", async () => {
  const display = await auth.afterConnect!(
    {
      credential: {
        apiKey: "supersecret",
        instance: "federal",
        project: " default ",
        environment: "",
      },
    } as never,
    null as never,
  ) as Record<string, unknown>;
  assertEquals(display, {
    instance: "federal",
    projectKey: "default",
    environmentKey: undefined,
  });
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});
