import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/basic.ts";

Deno.test("basic: collects the instance alongside the credential", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  // The instance identifies the ACCOUNT, so it belongs to the Connection
  // rather than being re-entered on every action.
  assertEquals(keys, ["instance", "username", "password"]);
  assertEquals(auth.fields?.find((f) => f.key === "password")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "instance")?.type, "string");
});

Deno.test("basic: sign sets a plain HTTP Basic header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.service-now.com/api/now/table/incident",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { username: "jo", password: "tok" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${btoa("jo:tok")}`);
});

Deno.test("basic: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { instance: "acme" } }, ctx), {
    ok: false,
    message: "credential missing instance, username or password",
  });
  assertEquals(calls.length, 0);
});

Deno.test("basic: test probes sys_user_role on the instance's own host", async () => {
  const ok = mockCtx([{ body: { result: [] } }]);
  assertEquals(
    await auth.test(
      { credential: { instance: "acme", username: "jo", password: "tok" } },
      ok.ctx,
    ),
    { ok: true },
  );
  assertEquals(
    ok.calls[0].url,
    "https://acme.service-now.com/api/now/table/sys_user_role?sysparm_limit=1",
  );
  assertEquals(ok.calls[0].headers["authorization"], `Basic ${btoa("jo:tok")}`);
});

Deno.test("basic: test reports a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(
    await auth.test({ credential: { instance: "acme", username: "jo", password: "bad" } }, ctx),
    { ok: false, message: "ServiceNow returned 401" },
  );
});

Deno.test("basic: afterConnect records the instance and username with no extra request", async () => {
  const { ctx, calls } = mockCtx();
  const out = await auth.afterConnect!(
    { credential: { instance: "acme", username: "jo", password: "tok" } },
    ctx,
  );
  assertEquals(out, { instance: "acme", username: "jo" });
  assertEquals(calls.length, 0);
});
