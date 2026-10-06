import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import {
  csv,
  domainFromConnection,
  EgnyteClient,
  encodePath,
  fromBase64,
  toBase64,
} from "../../lib/client.ts";

Deno.test("encodePath: encodes each segment, keeps the slashes", () => {
  assertEquals(encodePath("Shared/example?path/$file.txt"), "Shared/example%3Fpath/%24file.txt");
  assertEquals(encodePath("/Shared/My Docs/"), "Shared/My%20Docs");
});

Deno.test("base64 helpers round-trip arbitrary bytes", () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 255, 128]);
  assertEquals(Array.from(fromBase64(toBase64(bytes))), Array.from(bytes));
  const big = new Uint8Array(100_000).fill(7);
  assertEquals(fromBase64(toBase64(big)).length, 100_000);
});

Deno.test("csv: splits and trims, blank is unset", () => {
  assertEquals(csv("a@x.com, b@x.com"), ["a@x.com", "b@x.com"]);
  assertEquals(csv(""), undefined);
});

Deno.test("domainFromConnection: throws without a recorded domain", () => {
  assertThrows(() => domainFromConnection(undefined), Error, "no domain");
});

Deno.test("client: builds the per-domain host and never sets authorization", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { ok: 1 } }], "globex");
  const out = await new EgnyteClient(ctx).request("/v1/userinfo", { query: { a: 1, b: "" } });
  assertEquals(out, { ok: 1 });
  assertEquals(calls[0].url, "https://globex.egnyte.com/pubapi/v1/userinfo?a=1");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: surfaces status, path and body on failure", async () => {
  const { ctx } = mockEgnyteCtx([{ status: 403, body: { errorMessage: "nope" } }]);
  await assertRejects(
    async () => await new EgnyteClient(ctx).request("/v1/fs/Shared"),
    Error,
    "Egnyte 403",
  );
});

Deno.test("client: empty and 204 bodies resolve to undefined", async () => {
  const { ctx } = mockEgnyteCtx([{ status: 204 }, { body: "" }]);
  const c = new EgnyteClient(ctx);
  assertEquals(await c.request("/v1/x", { method: "DELETE" }), undefined);
  assertEquals(await c.request("/v1/x", { method: "DELETE" }), undefined);
});
