import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/pat.ts";

const projects = (list: unknown[]) => ({ status: 200, body: { count: list.length, value: list } });
const creds = { organization: "contoso", token: "pat_1" };

/** The token goes in the PASSWORD, with an empty username. */
Deno.test("pat: sign sends Basic auth with an empty username", () => {
  const request = {
    url: "https://dev.azure.com/contoso/_apis/projects",
    method: "GET",
    headers: {},
  };
  const signed = auth.sign!({ request, credential: creds }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(atob(signed.headers["authorization"].slice(6)), ":pat_1");
});

Deno.test("pat: test names the projects the token can see", async () => {
  const { ctx, calls } = mockCtx([projects([{ name: "Payments" }, { name: "Web" }])]);
  const result = await auth.test!({ credential: creds }, ctx);
  assert(calls[0].url.startsWith("https://dev.azure.com/contoso/_apis/projects"), calls[0].url);
  assertEquals(result.ok, true);
  assert(result.message!.includes("Payments"), result.message);
});

/** A rejected token answers 302 to a sign-in page, not 401. */
Deno.test("pat: the test never follows redirects, and reports a 302 as a rejection", async () => {
  const { ctx, calls } = mockCtx([{ status: 302, body: "<html>sign in</html>" }]);
  const result = await auth.test!({ credential: creds }, ctx);
  assertEquals(calls[0].redirect, "manual");
  assertEquals(result.ok, false);
  assert(/sign-in page/.test(result.message!), result.message);
  assert(/expired or been revoked/.test(result.message!), result.message);
});

/**
 * Authenticated and blind is almost always a missing Project and Team scope,
 * and saying so is the point.
 */
Deno.test("pat: seeing no projects connects, and names the likely scope", async () => {
  const { ctx } = mockCtx([projects([])]);
  const result = await auth.test!({ credential: creds }, ctx);
  assertEquals(result.ok, true);
  assert(/Project and Team \(read\) scope/.test(result.message!), result.message);
});

Deno.test("pat: a 404 means the organization name is wrong", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await auth.test!({ credential: creds }, ctx);
  assertEquals(result.ok, false);
  assert(/no organization named "contoso"/.test(result.message!), result.message);
});

Deno.test("pat: a 401 is a plain rejection", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  assertEquals((await auth.test!({ credential: creds }, ctx)).ok, false);
});

Deno.test("pat: any other failure reports the status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await auth.test!({ credential: creds }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("503"), result.message);
});

Deno.test("pat: a half-missing credential is refused before a request", async () => {
  const noOrg = mockCtx();
  assertEquals((await auth.test!({ credential: { token: "t" } }, noOrg.ctx)).ok, false);
  assertEquals(noOrg.calls.length, 0);

  const noToken = mockCtx();
  assertEquals((await auth.test!({ credential: { organization: "c" } }, noToken.ctx)).ok, false);
  assertEquals(noToken.calls.length, 0);
});

/** The organization is public metadata; the token never is. */
Deno.test("pat: afterConnect records the organization, not the token", () => {
  const display = auth.afterConnect!(
    { credential: { organization: "contoso", token: "pat_secret" } },
    mockCtx().ctx,
  );
  assertEquals(display, { organization: "contoso" });
  assert(!JSON.stringify(display).includes("pat_secret"));
});

Deno.test("pat: is basic auth with the token as the only secret field", () => {
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields!.map((f) => f.key), ["organization", "token"]);
  assertEquals(auth.fields![1].type, "secret");
});
