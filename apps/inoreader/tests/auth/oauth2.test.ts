import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { mockCtx, text } from "../_helpers.ts";

const cred = { accessToken: "tok123" };

Deno.test("oauth2: endpoints, scopes and pkce are as documented", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://www.inoreader.com/oauth2/auth");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://www.inoreader.com/oauth2/token");
  assertEquals(oauth2.oauth2?.scopes, ["read", "write"]);
  assertEquals(oauth2.oauth2?.scopeSeparator, " ");
  assertEquals(oauth2.oauth2?.pkce, false);
  assertEquals(oauth2.refresh, undefined);
});

Deno.test("oauth2: no client id/secret or AppId/AppKey is declared in the package", () => {
  const s = JSON.stringify(oauth2.oauth2 ?? {}) + JSON.stringify(oauth2.fields ?? []);
  assert(!/client_?(id|secret)|appkey|appid/i.test(s), s);
});

Deno.test("oauth2: sign stamps a bearer header and nothing else", () => {
  const { ctx } = mockCtx();
  const req = {
    url: "https://www.inoreader.com/reader/api/0/user-info",
    method: "GET",
    headers: {},
  } as {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  const out = oauth2.sign!({ request: req, credential: cred }, ctx) as typeof req;
  assertEquals(out.headers, { authorization: "Bearer tok123" });
});

Deno.test("oauth2: test passes on a user object and calls /user-info", async () => {
  const { ctx, calls } = mockCtx([{ body: { userId: "1001921515", userName: "Bender" } }]);
  assertEquals(await oauth2.test!({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://www.inoreader.com/reader/api/0/user-info");
  assertEquals(calls[0].headers["authorization"], "Bearer tok123");
});

Deno.test("oauth2: test refuses a 200 that is not a user object", async () => {
  const { ctx } = mockCtx([text("<html>shell</html>")]);
  const r = await oauth2.test!({ credential: cred }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("not the documented"));
});

Deno.test("oauth2: test classifies 401 / 403 / 429 / other from the body and says what to do", async () => {
  const run = async (status: number, body: string) => {
    const { ctx } = mockCtx([text(body, status)]);
    return await oauth2.test!({ credential: cred }, ctx);
  };
  const r401 = await run(401, "OAuth token not found or invalid.");
  assertEquals(r401.ok, false);
  assert(
    r401.message?.includes("OAuth token not found or invalid.") &&
      r401.message.includes("reconnect"),
  );
  const r403 = await run(403, "AppId required! Contact app developer.");
  assert(r403.message?.includes("AppId required!"));
  const r429 = await run(429, "");
  assert(r429.message?.includes("not judged"));
  const r500 = await run(500, "boom");
  assertEquals(r500.message, "Inoreader returned HTTP 500 for /user-info");
});

Deno.test("oauth2: afterConnect labels the connection from userName; never throws", async () => {
  const ok = mockCtx([{ body: { userId: 42, userName: "Bender" } }]);
  assertEquals(await oauth2.afterConnect!({ credential: cred }, ok.ctx), {
    user: { id: "42", name: "Bender" },
  });
  const noName = mockCtx([{ body: { userId: 42 } }]);
  assertEquals(
    (await oauth2.afterConnect!({ credential: cred }, noName.ctx) as { user: { name: string } })
      .user.name,
    "Inoreader user 42",
  );
  const bad = mockCtx([text("Error=x", 401)]);
  assertEquals(await oauth2.afterConnect!({ credential: cred }, bad.ctx), {});
  const thrown = mockCtx([]);
  assertEquals(await oauth2.afterConnect!({ credential: cred }, thrown.ctx), {});
});
