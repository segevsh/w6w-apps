import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: collects the site alongside the credential", () => {
  assertEquals(auth.key, "api-token");
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields?.map((f) => f.key), ["site", "email", "apiToken"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiToken")?.type, "secret");
});

Deno.test("api-token: sign uses the account email as the Basic username", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.atlassian.net/rest/api/3/myself",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { email: "jo@acme.test", apiToken: "tok" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${btoa("jo@acme.test:tok")}`);
});

Deno.test("api-token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { site: "acme" } }, ctx), {
    ok: false,
    message: "credential missing site, email or apiToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test probes /myself on the site host", async () => {
  const ok = mockCtx([{ body: { accountId: "a1" } }]);
  assertEquals(
    await auth.test({ credential: { site: "acme", email: "a@b.c", apiToken: "t" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://acme.atlassian.net/rest/api/3/myself");
});

Deno.test("api-token: afterConnect records the site for the client to use", async () => {
  const { ctx } = mockCtx([{
    body: { accountId: "a1", displayName: "Jo", emailAddress: "jo@acme.test" },
  }]);
  assertEquals(await auth.afterConnect!({ credential: { site: "acme" } }, ctx), {
    site: "acme",
    user: { id: "a1", displayName: "Jo", email: "jo@acme.test" },
  });
});

Deno.test("api-token: afterConnect still records the site if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.afterConnect!({ credential: { site: "acme" } }, ctx), { site: "acme" });
});
