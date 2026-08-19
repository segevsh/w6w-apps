import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/container-create.ts";

const D = { display: { account: "myaccount" } };
const created = { status: 201, body: "", headers: { etag: '"0x8D"' } };

Deno.test("container-create: PUTs with restype=container", async () => {
  const { ctx, calls } = mockCtx([created], D);
  const result = await action.execute({ container: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).searchParams.get("restype"), "container");
  assertEquals(result.created, true);
  assertEquals(result.etag, '"0x8D"');
});

/** Private is the default, and the header is simply absent for it. */
Deno.test("container-create: sends no public-access header by default", async () => {
  const { ctx, calls, logs } = mockCtx([created], D);
  const result = await action.execute({ container: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].headers["x-ms-blob-public-access"], undefined);
  assertEquals(result.publicAccess, undefined);
  assertEquals(logs[0].level, "info");
});

/** The difference between private and enumerable is one dropdown. */
Deno.test("container-create: either public level needs an acknowledgement", async () => {
  for (const level of ["blob", "container"]) {
    const { ctx, calls } = mockCtx([], D);
    let message = "";
    try {
      await action.execute({ container: "uploads", publicAccess: level }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/set `confirmPublic`/.test(message), `${level}: ${message}`);
    assert(/with no credential of any kind/.test(message), message);
    assertEquals(calls.length, 0);
  }
});

/** `container` is worse than `blob` and the message says how. */
Deno.test("container-create: the refusal distinguishes the two levels", async () => {
  const listable = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ container: "uploads", publicAccess: "container" }, listable.ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/lets anyone LIST the contents/.test(message), message);

  const byUrl = mockCtx([], D);
  let urlMessage = "";
  try {
    await action.execute({ container: "uploads", publicAccess: "blob" }, byUrl.ctx);
  } catch (err) {
    urlMessage = String(err);
  }
  assert(/URL is then the only thing protecting it/.test(urlMessage), urlMessage);
});

Deno.test("container-create: an acknowledged public container is created and warned about", async () => {
  const { ctx, calls, logs } = mockCtx([created], D);
  const result = await action.execute(
    { container: "uploads", publicAccess: "blob", confirmPublic: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].headers["x-ms-blob-public-access"], "blob");
  assertEquals(result.publicAccess, "blob");
  assertEquals(logs[0].level, "warn");
  assert(/needs no credential/.test(logs[0].message), logs[0].message);
});

/** Azure requires C# identifiers and rejects a hyphen. */
Deno.test("container-create: metadata names are validated before sending", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ container: "uploads", metadata: '{"uploaded-by":"x"}' }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/not a valid C# identifier/.test(message), message);
  assert(/rejects hyphens/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("container-create: valid metadata becomes x-ms-meta headers", async () => {
  const { ctx, calls } = mockCtx([created], D);
  await action.execute({ container: "uploads", metadata: '{"uploaded_by":"workflow"}' }, ctx);
  assertEquals(calls[0].headers["x-ms-meta-uploaded_by"], "workflow");
});

Deno.test("container-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
