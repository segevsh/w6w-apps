import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

const cred = { linkname: "acme", accessToken: "tok" };

Deno.test("access-token: collects the link name alongside the secret token", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.map((f) => f.key), ["linkname", "accessToken"]);
  assertEquals(auth.fields?.find((f) => f.key === "accessToken")?.type, "secret");
  const pattern = new RegExp(auth.fields?.find((f) => f.key === "linkname")?.validation?.pattern!);
  assertEquals(pattern.test("acme"), true);
  assertEquals(pattern.test("acme.salesmate.io"), false);
  assertEquals(pattern.test("evil.com/x"), false);
});

Deno.test("access-token: sign sets the accessToken and x-linkname headers", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.salesmate.io/apis/contact/v4/1",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred }, ctx);
  assertEquals(out.headers["accesstoken"], "tok");
  assertEquals(out.headers["x-linkname"], "acme.salesmate.io");
});

Deno.test("access-token: sign refuses another host, even another salesmate.io account", async () => {
  const { ctx } = mockCtx();
  for (const url of ["https://other.salesmate.io/apis/x", "https://evil.example.com/apis/x"]) {
    const request = { url, method: "GET", headers: {} as Record<string, string> };
    let threw = false;
    try {
      await auth.sign!({ request, credential: cred }, ctx);
    } catch {
      threw = true;
    }
    assertEquals(threw, true, url);
    assertEquals(request.headers["accesstoken"], undefined);
  }
});

Deno.test("access-token: sign refuses a hostile link name", () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://evil.com/apis/x",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  assertThrows(
    () => auth.sign!({ request, credential: { linkname: "evil.com", accessToken: "t" } }, ctx),
    Error,
    "Invalid Salesmate link name",
  );
});

Deno.test("access-token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { linkname: "acme" } }, ctx), {
    ok: false,
    message: "credential missing linkname or accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test refuses a hostile link name without a request", async () => {
  const { ctx, calls } = mockCtx();
  const out = await auth.test({ credential: { linkname: "evil.com/#", accessToken: "t" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test passes on a well-formed success body", async () => {
  const ok = mockCtx([{ body: { Status: "success", Data: [{ id: 1, firstName: "A" }] } }]);
  assertEquals(await auth.test({ credential: cred }, ok.ctx), { ok: true });
  assertEquals(ok.calls[0].url, "https://acme.salesmate.io/apis/core/v4/users?status=active");
  assertEquals(ok.calls[0].headers["accesstoken"], "tok");
  assertEquals(ok.calls[0].headers["x-linkname"], "acme.salesmate.io");
});

Deno.test("access-token: a 200 that is not the documented shape is NOT a pass", async () => {
  const html = mockCtx([{ body: "<html>shell</html>", headers: { "content-type": "text/html" } }]);
  assertEquals((await auth.test({ credential: cred }, html.ctx)).ok, false);
});

Deno.test("access-token: classifies a dead token from the vendor's error name, not the status", async () => {
  // Same body at 401 and 403 and 200: the body decides.
  for (const status of [401, 403, 200]) {
    const bad = mockCtx([{
      status,
      body: { Status: "failure", Error: { message: "", name: "AuthorizationFailed" } },
    }]);
    assertEquals(await auth.test({ credential: cred }, bad.ctx), {
      ok: false,
      message: "Salesmate rejected the access token.",
    });
  }
});

Deno.test("access-token: an unknown link name is reported as such", async () => {
  const bad = mockCtx([{
    status: 404,
    body: { Status: "failure", Error: { message: "Link  not found", name: "NoSuchLinkExist" } },
  }]);
  assertEquals(await auth.test({ credential: cred }, bad.ctx), {
    ok: false,
    message: "No Salesmate account exists for this link name.",
  });
});

Deno.test("access-token: test never echoes the credential in its message", async () => {
  const bad = mockCtx([{ status: 500, body: { Status: "failure", Error: { Message: "boom" } } }]);
  const out = await auth.test(
    { credential: { linkname: "acme", accessToken: "s3cret-tok" } },
    bad.ctx,
  );
  assertEquals(JSON.stringify(out).includes("s3cret-tok"), false);
});

Deno.test("access-token: afterConnect records only the link name", () => {
  assertEquals(auth.afterConnect!({ credential: cred }, {} as never), { linkname: "acme" });
  assertEquals(auth.afterConnect!({ credential: { accessToken: "t" } }, {} as never), {});
});
