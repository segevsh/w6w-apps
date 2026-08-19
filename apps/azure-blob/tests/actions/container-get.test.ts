import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/container-get.ts";

const D = { display: { account: "myaccount" } };

const properties = (headers: Record<string, string>) => ({
  status: 200,
  body: "",
  headers: { "last-modified": "Tue, 19 Aug 2026 10:00:00 GMT", ...headers },
});

/** The whole answer is in the headers; the body is empty by design. */
Deno.test("container-get: HEADs the container and reads the headers", async () => {
  const { ctx, calls } = mockCtx([properties({ "x-ms-lease-state": "available" })], D);
  const result = await action.execute({ container: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "HEAD");
  assertEquals(new URL(calls[0].url).searchParams.get("restype"), "container");
  assertEquals(result.leaseState, "available");
  assertEquals(result.lastModified, "Tue, 19 Aug 2026 10:00:00 GMT");
});

Deno.test("container-get: absent public access means private", async () => {
  const { ctx, logs } = mockCtx([properties({})], D);
  const result = await action.execute({ container: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.publicAccess, undefined);
  assertEquals(result.isPublic, false);
  assertEquals(logs.length, 0);
});

Deno.test("container-get: a public container is flagged and warned about", async () => {
  const { ctx, logs } = mockCtx([properties({ "x-ms-blob-public-access": "container" })], D);
  const result = await action.execute({ container: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.isPublic, true);
  assertEquals(logs[0].level, "warn");
});

/** The only thing in Azure Storage the account key cannot override. */
Deno.test("container-get: immutability and legal hold are surfaced", async () => {
  const { ctx, logs } = mockCtx([properties({
    "x-ms-has-immutability-policy": "true",
    "x-ms-has-legal-hold": "true",
  })], D);
  const result = await action.execute({ container: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.immutable, true);
  assertEquals(result.legalHold, true);
  assert(/not even with the account key/.test(logs[0].message), logs[0].message);
  assert(/outranks it/.test(action.description!), action.description);
});

/** HTTP header names are case-insensitive; Azure lowercases them. */
Deno.test("container-get: metadata comes back with the prefix stripped", async () => {
  const { ctx } = mockCtx([properties({ "x-ms-meta-owner": "platform" })], D);
  const result = await action.execute({ container: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.metadata, { owner: "platform" });
});

Deno.test("container-get: a name with capitals is refused before the request", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ container: "Uploads" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/rejects uppercase outright/.test(message), message);
  assertEquals(calls.length, 0);
});
