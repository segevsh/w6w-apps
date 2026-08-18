import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/token.ts";

const cred = { token: "hf_test" };

Deno.test("token: signs as a bearer", () => {
  const request = {
    url: "https://huggingface.co/api/models",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer hf_test");
  assertEquals(auth.type, "bearer");
});

Deno.test("token: the test reports the identity and what it may do", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      name: "alice",
      type: "user",
      orgs: [{ name: "acme" }],
      auth: { accessToken: { role: "write" } },
    },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, "https://huggingface.co/api/whoami-v2");
  assertEquals(result.ok, true);
  assert(/alice/.test(result.message!), result.message);
  assert(/write access/.test(result.message!), result.message);
  assert(/1 organisation/.test(result.message!), result.message);
});

/** The rejection message mentions a username and a password, and there are neither. */
Deno.test("token: a rejection explains the misleading message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Invalid username or password." } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/says nothing\s+about tokens/.test(result.message!), result.message);
});

Deno.test("token: a missing token or an unreachable Hub fails cleanly", async () => {
  const none = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  assertEquals((await auth.test!({ credential: cred } as never, offline)).ok, false);
});

Deno.test("token: a non-JSON body fails rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html/>" }]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, false);
});

/** The role is what makes a later 403 explicable. */
Deno.test("token: afterConnect records the account, role and organisations", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      name: "alice",
      type: "user",
      orgs: [{ name: "acme" }, { name: "other" }],
      auth: { accessToken: { role: "read" } },
    },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.name, "alice");
  assertEquals(display.role, "read");
  assertEquals(display.orgs, ["acme", "other"]);
});

Deno.test("token: afterConnect survives the call failing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, ctx), {});
});

/** A fine-grained token fails per repository, which reads as intermittent. */
Deno.test("token: the hint recommends fine-grained tokens and says how they fail", () => {
  const field = auth.fields!.find((f) => f.key === "token")!;
  assert(/Fine-grained tokens list the/.test(field.hint!), field.hint);
  assertEquals(field.type, "secret");
  assert(/returns 403 while everything else works/.test(auth.description!), auth.description);
});
