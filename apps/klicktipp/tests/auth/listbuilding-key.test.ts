import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/listbuilding-key.ts";

const req = (body?: string) => ({
  url: "https://api.klicktipp.com/subscriber/signin",
  method: "POST",
  headers: {} as Record<string, string>,
  body,
});

Deno.test("listbuilding-key: sign merges apikey into the JSON body the action built", async () => {
  const { ctx } = mockCtx();
  const out = await auth.sign!(
    { request: req(JSON.stringify({ email: "a@example.com" })), credential: { apiKey: "K" } },
    ctx,
  );
  assertEquals(JSON.parse(out.body as string), { email: "a@example.com", apikey: "K" });
  assertEquals(out.headers["content-type"], "application/json");
});

Deno.test("listbuilding-key: sign works with no body, and overwrites a caller-supplied apikey", async () => {
  const { ctx } = mockCtx();
  const a = await auth.sign!({ request: req(), credential: { apiKey: "K" } }, ctx);
  assertEquals(JSON.parse(a.body as string), { apikey: "K" });
  const b = await auth.sign!(
    { request: req('{"apikey":"forged"}'), credential: { apiKey: "K" } },
    ctx,
  );
  assertEquals(JSON.parse(b.body as string), { apikey: "K" });
});

Deno.test("listbuilding-key: test fails on error 100 (observed live with a bogus key)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 406,
    body: { error: 100, error_message: "Ungültiger API-Key." },
  }]);
  const r = await auth.test({ credential: { apiKey: "bogus" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("invalid API key"), r.message);
  assert(!r.message!.includes("bogus"), "the message must not echo the key");
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/signin");
  assertEquals(JSON.parse(calls[0].body!), { apikey: "bogus" });
});

Deno.test("listbuilding-key: test passes when the key clears and only the missing contact is refused", async () => {
  for (const error of [32, 5, 7]) {
    const { ctx } = mockCtx([{ status: 406, body: { error } }]);
    assertEquals(
      await auth.test({ credential: { apiKey: "K" } }, ctx),
      { ok: true },
      `error ${error}`,
    );
  }
});

Deno.test("listbuilding-key: test does not pass on an unrecognised answer", async () => {
  const a = mockCtx([{ status: 200, body: ["https://pending"] }]);
  assertEquals((await auth.test({ credential: { apiKey: "K" } }, a.ctx)).ok, false);
  const b = mockCtx([{ status: 502, body: "<html>" }]);
  assertEquals((await auth.test({ credential: { apiKey: "K" } }, b.ctx)).ok, false);
  const c = mockCtx();
  assertEquals((await auth.test({ credential: {} }, c.ctx)).ok, false);
});
