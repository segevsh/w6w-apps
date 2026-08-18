import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-create.ts";

const display = { projectId: "proj_1" };
const created = { status: 200, body: { api_key_id: "k1", key: "dg_newsecret" } };

Deno.test("key-create: posts the name and scopes", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({ comment: "nightly transcription", scopes: "member" }, ctx);
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects/proj_1/keys");
  assertEquals(JSON.parse(calls[0].body!), {
    comment: "nightly transcription",
    scopes: ["member"],
  });
});

Deno.test("key-create: a lifetime in days becomes an expiry date", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({ comment: "temp", scopes: "member", expiresInDays: 7 }, ctx);
  const expiry = JSON.parse(calls[0].body!).expiration_date as string;
  assert(!Number.isNaN(Date.parse(expiry)), expiry);
  assert(Date.parse(expiry) > Date.now(), expiry);
});

Deno.test("key-create: no lifetime means no expiry field at all", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({ comment: "x", scopes: "member", expiresInDays: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).expiration_date, undefined);
});

/** The value is in this response only, and must not be duplicated into a log. */
Deno.test("key-create: logs the id and scopes, never the key it just minted", async () => {
  const { ctx, logs } = mockCtx([created], { display });
  await action.execute!({ comment: "x", scopes: "admin" }, ctx);
  assert(!JSON.stringify(logs).includes("dg_newsecret"), JSON.stringify(logs));
  assertEquals(logs[0].data, { apiKeyId: "k1", scopes: ["admin"], expires: "never" });
});

Deno.test("key-create: an unnamed key is refused before the request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ scopes: "member" }, ctx),
    Error,
    "unreviewable",
  );
  assertEquals(calls.length, 0);
});

Deno.test("key-create: says the value is returned only once", () => {
  assert(/ONCE and never again/.test(action.description!), action.description);
});
