import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { MandrillClient, parseRecipients } from "../../lib/client.ts";

Deno.test("MandrillClient.request: POSTs JSON to <API_URL><path> and returns the parsed body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { PING: "PONG!" } }]);
  const client = new MandrillClient(ctx);
  const out = await client.request("/users/ping2.json", {});
  assertEquals(out, { PING: "PONG!" });
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "mandrillapp.com");
  assertEquals(url.pathname, "/api/1.0/users/ping2.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("MandrillClient.request: never sets `key` itself", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const client = new MandrillClient(ctx);
  await client.request("/tags/list.json", {});
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("MandrillClient.request: throws with the vendor's `message` on a non-2xx (HTTP 500)", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { status: "error", code: -1, name: "Invalid_Key", message: "Invalid API key" },
  }]);
  const client = new MandrillClient(ctx);
  await assertRejects(
    () => client.request("/users/info.json", {}),
    Error,
    "Invalid API key",
  );
});

Deno.test("MandrillClient.request: falls back to raw text when the error body isn't JSON", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "Bad Gateway" }]);
  const client = new MandrillClient(ctx);
  await assertRejects(
    () => client.request("/users/info.json", {}),
    Error,
    "Bad Gateway",
  );
});

Deno.test("parseRecipients: tags plain, comma-separated, and Name-<addr> forms with `type`", () => {
  assertEquals(parseRecipients("a@x.com", "to"), [{ email: "a@x.com", type: "to" }]);
  assertEquals(
    parseRecipients("a@x.com, b@x.com", "cc"),
    [{ email: "a@x.com", type: "cc" }, { email: "b@x.com", type: "cc" }],
  );
  assertEquals(
    parseRecipients("Ada <a@x.com>", "bcc"),
    [{ email: "a@x.com", name: "Ada", type: "bcc" }],
  );
});

Deno.test("parseRecipients: strips wrapping quotes from names", () => {
  assertEquals(parseRecipients('"Ada Lovelace" <a@x.com>', "to"), [
    { email: "a@x.com", name: "Ada Lovelace", type: "to" },
  ]);
});

Deno.test("parseRecipients: passes structured input through, tagging with `type`", () => {
  assertEquals(
    parseRecipients([{ email: "a@x.com", name: "Ada" }, { email: "b@x.com" }], "to"),
    [{ email: "a@x.com", name: "Ada", type: "to" }, { email: "b@x.com", type: "to" }],
  );
});

Deno.test("parseRecipients: empty/undefined input yields an empty array", () => {
  assertEquals(parseRecipients(undefined, "to"), []);
  assertEquals(parseRecipients("", "to"), []);
});

Deno.test("MandrillClient.request: returns undefined for an empty 200 body", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  const client = new MandrillClient(ctx);
  const out = await client.request("/templates/delete.json", { name: "x" });
  assertEquals(out, undefined);
});

Deno.test("sanity: mockCtx queues respect insertion order", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: 1 }, { status: 200, body: 2 }]);
  const client = new MandrillClient(ctx);
  const a = await client.request("/a.json", {});
  const b = await client.request("/b.json", {});
  assertEquals(a, 1);
  assertEquals(b, 2);
  assert(calls.length === 2);
});
