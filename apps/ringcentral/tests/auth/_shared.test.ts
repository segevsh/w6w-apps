import { assert, assertEquals } from "@std/assert";
import { probeCredential, whoAmIDisplay } from "../../auth/_shared.ts";
import { WHOAMI_PATH } from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

// --- probeCredential ---------------------------------------------------------

Deno.test("probeCredential: fails without making a request when accessToken is missing", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await probeCredential(ctx, undefined);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("probeCredential: passes when the whoami answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", name: "Alice", extensionNumber: "101" } }]);
  const result = await probeCredential(ctx, "tok");
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), WHOAMI_PATH);
  assertEquals(calls[0].headers.authorization, "Bearer tok");
});

Deno.test("probeCredential: AGW-401 is reported as the credential never arriving", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("AGW-401", "Authorization header is not specified") },
  ]);
  const result = await probeCredential(ctx, "tok");
  assertEquals(result.ok, false);
  assert(/no Authorization header/i.test(result.message ?? ""), result.message);
});

Deno.test("probeCredential: TokenInvalid is reported as a rejected token", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("TokenInvalid", "OAuth token is invalid") },
  ]);
  const result = await probeCredential(ctx, "tok");
  assertEquals(result.ok, false);
  assert(/rejected the access token/i.test(result.message ?? ""), result.message);
});

Deno.test("probeCredential: a 403 is reported as a permission refusal, not a bad token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("CMN-405", "Permission missing") }]);
  const result = await probeCredential(ctx, "tok");
  assertEquals(result.ok, false);
  assert(/refused the whoami/i.test(result.message ?? ""), result.message);
  assert(/CMN-405/.test(result.message ?? ""), result.message);
});

Deno.test("probeCredential: a 500 is reported as an HTTP failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await probeCredential(ctx, "tok");
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

// --- whoAmIDisplay -------------------------------------------------------------

Deno.test("whoAmIDisplay: keeps only name, extensionNumber and accountId", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        id: "1",
        name: "Alice Smith",
        extensionNumber: "101",
        account: { id: "999" },
        contact: { email: "alice@example.com" },
        permissions: { admin: { value: true } },
      },
    },
  ]);
  const display = await whoAmIDisplay(ctx, "tok");
  assertEquals(display, { name: "Alice Smith", extensionNumber: "101", accountId: "999" });
});

Deno.test("whoAmIDisplay: stays silent when the whoami fails or has no accessToken", async () => {
  const { ctx } = mockCtx([{ status: 403 }]);
  assertEquals(await whoAmIDisplay(ctx, "tok"), {});
  assertEquals(await whoAmIDisplay({} as never, undefined), {});
});
