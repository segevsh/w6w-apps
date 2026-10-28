import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blob-undelete.ts";

const D = { display: { account: "myaccount" } };

/** By name, with no version to name — unlike Cloud Storage. */
Deno.test("blob-undelete: PUTs comp=undelete with only the name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "", headers: { etag: '"0x8D"' } }], D);
  const result = await action.execute(
    { container: "uploads", blob: "logs/a.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).searchParams.get("comp"), "undelete");
  assertEquals(new URL(calls[0].url).pathname, "/uploads/logs%2Fa.log");
  assertEquals(result.restored, true);
  assertEquals(result.etag, '"0x8D"');
});

Deno.test("blob-undelete: takes no generation or version parameter at all", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assertEquals(keys, ["container", "blob"]);
  assert(/by NAME, with no version to name/.test(action.description!), action.description);
});

/** A 404 here has two meanings that look identical. */
Deno.test("blob-undelete: a 404 explains both of its meanings", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: "<Error><Code>BlobNotFound</Code><Message>not found</Message></Error>",
    headers: { "content-type": "application/xml", "x-ms-error-code": "BlobNotFound" },
  }], D);
  let message = "";
  try {
    await action.execute({ container: "uploads", blob: "a.log" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/never soft-deleted/.test(message), message);
  assert(/no soft-delete policy at all/.test(message), message);
  assert(/`blob-list` with `deleted`/.test(message), message);
});

/** Anything else should pass through unchanged. */
Deno.test("blob-undelete: another error is not rewritten", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: "<Error><Code>AuthorizationFailure</Code><Message>no</Message></Error>",
    headers: { "content-type": "application/xml", "x-ms-error-code": "AuthorizationFailure" },
  }], D);
  let message = "";
  try {
    await action.execute({ container: "uploads", blob: "a.log" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assertEquals(/never soft-deleted/.test(message), false);
  assert(/403/.test(message), message);
});

/** Safe to call speculatively, which a recovery workflow relies on. */
Deno.test("blob-undelete: is idempotent", () => {
  assertEquals(action.idempotent, true);
  assert(/Only works inside the retention window/.test(action.description!), action.description);
});
