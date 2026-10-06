import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  MailerSendClient,
  redactSecrets,
  toList,
  toRecipients,
  toUnix,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: arrays in a query are bracketed PHP-style and empties dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MailerSendClient(ctx).json("/x", {
    query: { status: ["a", "b"], q: "", z: undefined, n: 0 },
  });
  const u = new URL(calls[0].url);
  assertEquals(u.searchParams.getAll("status[]"), ["a", "b"]);
  assertEquals(u.searchParams.get("n"), "0");
  assertEquals(u.searchParams.has("q"), false);
});

Deno.test("client: an empty success body becomes {} and the error format carries fields", async () => {
  const a = mockCtx([{ status: 202, body: undefined }]);
  assertEquals(await new MailerSendClient(a.ctx).json("/x", { method: "POST", body: {} }), {});
  const b = mockCtx([{ status: 422, body: { message: "bad", errors: { f: ["m1", "m2"] } } }]);
  const e = await assertRejects(() => new MailerSendClient(b.ctx).json("/x"));
  assert(String(e).includes("MailerSend 422 for GET /x: bad"));
  assert(String(e).includes("f: m1"));
});

Deno.test("client: helpers", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
  assertEquals(toList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(undefined), undefined);
  assertEquals(toRecipients("a@x.com, b@x.com"), [{ email: "a@x.com" }, { email: "b@x.com" }]);
  assertEquals(toRecipients([{ email: "a@x.com", name: "A" }, "b@x.com"]), [
    { email: "a@x.com", name: "A" },
    { email: "b@x.com" },
  ]);
  assertEquals(toUnix("1443651141"), 1443651141);
  assertEquals(toUnix(12), 12);
});

Deno.test("client: redactSecrets strips keys containing secret at any depth, in arrays too", () => {
  assertEquals(
    redactSecrets({
      a: [{ signing_secret: "x", ok: 1 }],
      Secret: 1,
      b: { webhookSecret: 2, c: 3 },
    } as unknown),
    { a: [{ ok: 1 }], b: { c: 3 } },
  );
});
