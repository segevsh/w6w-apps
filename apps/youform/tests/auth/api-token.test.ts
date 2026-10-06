import { assertEquals } from "@std/assert";
import apiToken from "../../auth/api-token.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sign: stamps the bearer header and nothing else", async () => {
  const request = {
    url: "https://app.youform.com/api/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await apiToken.sign!(
    { request, credential: { token: "tok" } } as never,
    undefined as never,
  );
  assertEquals((out as typeof request).headers["authorization"], "Bearer tok");
});

Deno.test("test: ok on 200, probes /api/me with the bearer", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await apiToken.test!({ credential: { token: " tok " } } as never, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls[0].url, "https://app.youform.com/api/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("test: a missing token never reaches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiToken.test!({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: 401 and 500 are failures with distinct messages", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }, {
    status: 500,
    body: "x",
  }]);
  const a = await apiToken.test!({ credential: { token: "t" } } as never, ctx);
  const b = await apiToken.test!({ credential: { token: "t" } } as never, ctx);
  assertEquals(a.ok, false);
  assertEquals(a.message?.includes("rejected"), true);
  assertEquals(b.message?.includes("500"), true);
});

Deno.test("afterConnect: publishes email and name, never fails the connection", async () => {
  const { ctx } = mockCtx([
    { body: { data: { email: "a@b.co", first_name: "Ada", last_name: "L" } } },
    { status: 500, body: "x" },
  ]);
  assertEquals(await apiToken.afterConnect!({ credential: { token: "t" } } as never, ctx), {
    email: "a@b.co",
    name: "Ada L",
  });
  assertEquals(await apiToken.afterConnect!({ credential: { token: "t" } } as never, ctx), {});
});
