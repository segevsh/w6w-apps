import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import accessToken from "../../auth/access-token.ts";

const BU = "0Uv000000000001AAA";

Deno.test("access-token: is a bearer method whose token field is a secret", () => {
  assertEquals(accessToken.type, "bearer");
  const token = accessToken.fields!.find((f) => f.key === "accessToken")!;
  assertEquals(token.type, "secret");
  assertEquals(accessToken.fields!.map((f) => f.key), [
    "accessToken",
    "businessUnitId",
    "environment",
  ]);
});

Deno.test("access-token: sign stamps both headers and leaves others alone", async () => {
  const out = await accessToken.sign!(
    {
      request: { url: "https://x", method: "GET", headers: { accept: "application/json" } },
      credential: { accessToken: "tok", businessUnitId: BU },
    } as never,
    {} as never,
  ) as unknown as { headers: Record<string, string> };
  assertEquals(out.headers, {
    accept: "application/json",
    authorization: "Bearer tok",
    "pardot-business-unit-id": BU,
  });
});

Deno.test("access-token: test hits the chosen host and passes on a v5 answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [{ id: 1 }] } }]);
  const out = await accessToken.test(
    { credential: { accessToken: "t", businessUnitId: BU, environment: "demo" } } as never,
    ctx,
  );
  assertEquals(out, { ok: true });
  assertEquals(new URL(calls[0].url).host, "pi.demo.pardot.com");
});

Deno.test("access-token: test reports the vendor's own message for a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: 49, message: "Access Denied" } }]);
  const out = await accessToken.test(
    { credential: { accessToken: "secret-token", businessUnitId: BU } } as never,
    ctx,
  );
  assertEquals(out.ok, false);
  assert(out.message!.includes("[49] Access Denied"));
  assert(!out.message!.includes("secret-token"));
});

Deno.test("access-token: afterConnect records production host by default", async () => {
  const out = await accessToken.afterConnect!(
    { credential: { accessToken: "t", businessUnitId: BU } } as never,
    {} as never,
  ) as { host: string };
  assertEquals(out.host, "pi.pardot.com");
});
