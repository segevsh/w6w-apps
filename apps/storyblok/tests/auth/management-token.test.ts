import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/management-token.ts";

const credential = { token: "pat", spaceId: "123", region: "eu" };
const space = { status: 200, body: { space: { id: 123, name: "Marketing site", plan: "growth" } } };

/** Storyblok's own examples send the token raw; `Bearer` is a 401. */
Deno.test("management-token: signs with a bare Authorization header", () => {
  const request = {
    url: "https://mapi.storyblok.com/v1/spaces/123",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!({ request, credential } as never, mockCtx([]).ctx) as typeof request;
  assertEquals(signed.headers["authorization"], "pat");
  assert(!/Bearer/.test(signed.headers["authorization"]), "no scheme prefix");
});

Deno.test("management-token: the test probes the connection's space", async () => {
  const { ctx, calls } = mockCtx([space]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(calls[0].url, "https://mapi.storyblok.com/v1/spaces/123");
  assertEquals(result.ok, true);
  assert(/Marketing site/.test(result.message!), result.message);
  assert(/3 to 6 requests a second/.test(result.message!), result.message);
});

Deno.test("management-token: outside the EU it shares the delivery host", async () => {
  const { ctx, calls } = mockCtx([space]);
  await auth.test!({ credential: { ...credential, region: "ap" } } as never, ctx);
  assertEquals(calls[0].url, "https://api-ap.storyblok.com/v1/spaces/123");
});

Deno.test("management-token: a rejected token names the Bearer trap", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Unauthorized" } }]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/`Bearer` prefix/.test(result.message!), result.message);
});

Deno.test("management-token: a missing space id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: { token: "pat" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("management-token: afterConnect records the kind, space and plan", async () => {
  const { ctx } = mockCtx([space]);
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.credentialKind, "management");
  assertEquals(display.spaceId, "123");
  assertEquals(display.plan, "growth");
  assert(!JSON.stringify(display).includes('"pat"'), JSON.stringify(display));
});

Deno.test("management-token: is declared as a header key and warns about all-spaces", () => {
  assertEquals(auth.apiKey, { in: "header", name: "Authorization" });
  const field = auth.fields!.find((f) => f.key === "token")!;
  assert(/ALL SPACES/.test(field.hint!), field.hint);
});
