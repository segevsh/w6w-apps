import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/write-key.ts";

Deno.test("write-key: type is basic, fields are writeKey (secret, required)", () => {
  assertEquals(auth.key, "write-key");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  assertEquals(keys, ["writeKey"]);
  const field = auth.fields?.find((f) => f.key === "writeKey");
  assertEquals(field?.type, "secret");
  assertEquals(field?.required, true);
});

Deno.test("write-key: sign encodes the write key as Basic username with an empty password", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.segment.io/v1/identify",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { writeKey: "wk_123" } }, ctx);
  assertEquals(out.headers["authorization"], `Basic ${btoa("wk_123:")}`);
});

Deno.test("write-key: test rejects a credential with no writeKey, without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing writeKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("write-key: test posts a minimal identify call, signed with the write key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }]);
  assertEquals(await auth.test({ credential: { writeKey: "wk_123" } }, ctx), { ok: true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.segment.io/v1/identify");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("wk_123:")}`);
  assertEquals(JSON.parse(calls[0].body!), { anonymousId: "w6w-connection-test", traits: {} });
});

Deno.test("write-key: test surfaces a non-2xx as a failed check", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.test({ credential: { writeKey: "bad" } }, ctx), {
    ok: false,
    message: "Segment returned 401",
  });
});
