import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockMocoCtx } from "../_helpers.ts";
import {
  accountFromConnection,
  baseUrl,
  compact,
  errorDetail,
  MocoClient,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's account subdomain, not a param", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 1 } }], "acme");
  await new MocoClient(ctx).request("/projects/1");
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/projects/1");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no account", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new MocoClient(ctx), Error, "no account subdomain");
});

Deno.test("client: surfaces MOCO's `message` error body", async () => {
  const { ctx } = mockMocoCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: { message: "Invalid API key." },
  }]);
  await assertRejects(
    () => new MocoClient(ctx).request("/session"),
    Error,
    "Invalid API key.",
  );
});

Deno.test("client: surfaces MOCO's `errors` array body", async () => {
  const { ctx } = mockMocoCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body: { errors: ["Name can't be blank"] },
  }]);
  await assertRejects(
    () => new MocoClient(ctx).request("/contacts/people", { method: "POST", body: {} }),
    Error,
    "Name can't be blank",
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockMocoCtx([{ status: 204 }]);
  assertEquals(
    await new MocoClient(ctx).request("/invoices/1/update_status", { method: "PUT" }),
    undefined,
  );
});

Deno.test("client: list() reads X-Page/X-Per-Page/X-Total headers", async () => {
  const { ctx } = mockMocoCtx([{
    body: [{ id: 1 }, { id: 2 }],
    headers: {
      "content-type": "application/json",
      "x-page": "1",
      "x-per-page": "100",
      "x-total": "2",
    },
  }]);
  const { items, page } = await new MocoClient(ctx).list("/contacts/people");
  assertEquals(items, [{ id: 1 }, { id: 2 }]);
  assertEquals(page, { page: 1, perPage: 100, total: 2 });
});

Deno.test("accountFromConnection: reads the display data afterConnect records", () => {
  assertEquals(accountFromConnection({ display: { account: "acme" } } as never), "acme");
  assertThrows(() => accountFromConnection(undefined), Error, "no account subdomain");
});

Deno.test("baseUrl: builds the per-account host", () => {
  assertEquals(baseUrl("acme"), "https://acme.mocoapp.com/api/v1");
});

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false }), { a: 1, e: false });
});

Deno.test("errorDetail: prefers `message`, falls back to `errors`, then raw text", () => {
  assertEquals(errorDetail(JSON.stringify({ message: "Unauthorized" })), "Unauthorized");
  assertEquals(errorDetail(JSON.stringify({ errors: ["a", "b"] })), "a; b");
  assertEquals(
    errorDetail(JSON.stringify({ errors: { name: ["can't be blank"] } })),
    "name: can't be blank",
  );
  assertEquals(errorDetail("not json"), "not json");
  assertEquals(errorDetail(""), undefined);
});
