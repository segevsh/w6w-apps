import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/token.ts";

/** Gitea's own definition: "prepended with `token` followed by a space". */
Deno.test("token: signs with the `token` scheme, not Bearer", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://git.example.com/api/v1/user",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { token: "t1" } }, ctx);
  assertEquals(out.headers["authorization"], "token t1");
  assert(!out.headers["authorization"].startsWith("Bearer"), "Bearer is rejected by Gitea");
});

Deno.test("token: the URL and token are required, the default owner is not", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["baseUrl", "token"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["token"]);
});

/** Neither the query-parameter token nor basic auth is offered, on purpose. */
Deno.test("token: the description says why the other two schemes are declined", () => {
  const doc = auth.description!;
  assert(doc.includes("not `Bearer`"), doc);
  const fields = auth.fields!.map((f) => f.key);
  assert(!fields.includes("username"), "basic auth must not be offered");
  assert(!fields.includes("accessToken"), "the query-parameter scheme must not be offered");
});

Deno.test("token: test probes /user on the given instance", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { login: "ada" } }]);
  assertEquals(
    await auth.test!({ credential: { token: "t1", baseUrl: "git.example.com" } } as never, ctx),
    { ok: true },
  );
  assertEquals(calls[0].url, "https://git.example.com/api/v1/user");
  assertEquals(calls[0].headers["authorization"], "token t1");
});

/** The scheme mistake and a bad token look identical, so the message says both. */
Deno.test("token: a `token is required` 401 mentions the Bearer trap", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { message: "token is required", url: "https://git.example.com/api/swagger" },
  }]);
  const result = await auth.test!(
    { credential: { token: "t", baseUrl: "https://x.com" } } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(result.ok, false);
  assert(result.message.includes("Bearer"), result.message);
});

Deno.test("token: 403 and 404 get their own diagnoses", async () => {
  const forbidden = mockCtx([{ status: 403, body: {} }]);
  const a = await auth.test!(
    { credential: { token: "t", baseUrl: "https://x.com" } } as never,
    forbidden.ctx,
  ) as { message: string };
  assert(a.message.includes("scope"), a.message);

  const notFound = mockCtx([{ status: 404, body: {} }]);
  const b = await auth.test!(
    { credential: { token: "t", baseUrl: "https://x.com" } } as never,
    notFound.ctx,
  ) as { message: string };
  assert(b.message.includes("check the instance URL"), b.message);
});

Deno.test("token: a missing field fails before any network call", async () => {
  const noToken = mockCtx([]);
  assertEquals(
    await auth.test!({ credential: { baseUrl: "https://x.com" } } as never, noToken.ctx),
    {
      ok: false,
      message: "credential missing token",
    },
  );
  const noUrl = mockCtx([]);
  assertEquals(await auth.test!({ credential: { token: "t" } } as never, noUrl.ctx), {
    ok: false,
    message: "credential missing baseUrl",
  });
  assertEquals(noToken.calls.length + noUrl.calls.length, 0);
});

Deno.test("token: afterConnect records the instance and account, never the token", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { login: "ada" } }]);
  const display = await auth.afterConnect!(
    { credential: { token: "supersecret", baseUrl: "git.example.com/" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { baseUrl: "https://git.example.com", owner: "ada", login: "ada" });
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});

/** An explicitly chosen owner must survive the lookup. */
Deno.test("token: an explicit default owner is not overwritten by the account", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { login: "ada" } }]);
  const display = await auth.afterConnect!(
    { credential: { token: "t", baseUrl: "https://x.com", owner: "acme" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.owner, "acme");
  assertEquals(display.login, "ada");
});

Deno.test("token: a failed lookup still connects", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(
    await auth.afterConnect!(
      { credential: { token: "t", baseUrl: "https://x.com" } } as never,
      ctx,
    ),
    { baseUrl: "https://x.com", owner: undefined },
  );
});
