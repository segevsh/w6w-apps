import { assert, assertEquals } from "@std/assert";
import serviceUser, { basicHeader, classifyProbe } from "../../auth/service-user.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const cred = { serviceUserId: "SERVICE-1", serviceUserToken: "tok-en" };
const fields = [{ id: "root.id", categoryId: "1", type: "id" }];

Deno.test("service-user: sign stamps Basic base64(id:token)", () => {
  const out = serviceUser.sign!(
    { request: { headers: {} }, credential: cred } as never,
    mockCtx().ctx,
  ) as {
    headers: Record<string, string>;
  };
  assertEquals(out.headers["authorization"], `Basic ${btoa("SERVICE-1:tok-en")}`);
  assertEquals(basicHeader(cred), `Basic ${btoa("SERVICE-1:tok-en")}`);
});

Deno.test("service-user: test passes on the documented field-definition list", async () => {
  const { ctx, calls } = mockCtx([{ body: fields }]);
  const res = await serviceUser.test({ credential: cred } as never, ctx);
  assertEquals(res, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/company/people/fields");
  assertEquals(calls[0].headers["authorization"], basicHeader(cred));
});

Deno.test("service-user: a 200 with the wrong shape is NOT a pass (SPA/generic 200)", async () => {
  const { ctx } = mockCtx([{
    body: "<html>hello</html>",
    headers: { "content-type": "text/html" },
  }]);
  const res = await serviceUser.test({ credential: cred } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("documented list"), res.message);
});

Deno.test("service-user: a 401 with an EMPTY body is read as rejected credentials", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  const res = await serviceUser.test({ credential: cred } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("401"), res.message);
});

Deno.test("service-user: missing halves fail without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const res = await serviceUser.test({ credential: { serviceUserId: "x" } } as never, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("service-user: classifyProbe keeps 429 and 5xx from reading as a bad credential", () => {
  assert(classifyProbe(429, null).message!.includes("nothing about the credential"));
  assert(classifyProbe(503, { error: "down" }).message!.includes("Not a verdict"));
  assert(classifyProbe(403, { error: "nope" }).message!.includes("403"));
});

Deno.test("service-user: the probe response is never echoed into the verdict", () => {
  const msg = classifyProbe(200, [{ id: "root.id", secret: "tok-en" }]);
  assertEquals(msg, { ok: true });
});
