import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-signed-url.ts";
import { TEST_CLIENT_EMAIL } from "../lib/_vector.ts";

const display = { clientEmail: TEST_CLIENT_EMAIL };
// 0xde 0xad 0xbe 0xef, base64 — what signBlob answers with.
const signed = { status: 200, body: { signedBlob: "3q2+7w==" } };

Deno.test("object-signed-url: signs through IAM Credentials, not with a local key", async () => {
  const { ctx, calls } = mockCtx([signed], { display });
  const result = await action.execute(
    { bucket: "uploads", object: "reports/q3.pdf" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(
    calls[0].url,
    "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
      "signer%40test-project.iam.gserviceaccount.com:signBlob",
  );
  assertEquals(calls[0].method, "POST");
  assert(String(result.url).startsWith("https://storage.googleapis.com/uploads/reports/q3.pdf?"));
  assertEquals(new URL(String(result.url)).searchParams.get("X-Goog-Signature"), "deadbeef");
});

/** The URL is a bearer credential for its whole lifetime. */
Deno.test("object-signed-url: reports that it cannot be revoked, and defaults to 15 minutes", async () => {
  const { ctx } = mockCtx([signed], { display });
  const result = await action.execute(
    { bucket: "uploads", object: "a.pdf" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.revocable, false);
  assertEquals(action.params!.find((p) => p.key === "expiresIn")!.default, 900);
  assertEquals(new URL(String(result.url)).searchParams.get("X-Goog-Expires"), "900");
  assert(/CANNOT BE REVOKED/.test(action.description!), action.description);
});

/** A download URL must not be usable to write. */
Deno.test("object-signed-url: the method is signed, so a GET URL cannot upload", async () => {
  const get = mockCtx([signed], { display });
  const download = await action.execute(
    { bucket: "uploads", object: "a.pdf" },
    get.ctx,
  ) as Record<string, unknown>;
  assertEquals(download.method, "GET");

  const put = mockCtx([signed], { display });
  const upload = await action.execute(
    { bucket: "uploads", object: "a.pdf", method: "PUT" },
    put.ctx,
  ) as Record<string, unknown>;
  assertEquals(upload.method, "PUT");
  // The string being signed differs, so the two are not interchangeable.
  assert(JSON.parse(get.calls[0].body!).payload !== JSON.parse(put.calls[0].body!).payload);
});

Deno.test("object-signed-url: an upload URL can pin the content type", async () => {
  const { ctx } = mockCtx([signed], { display });
  const result = await action.execute({
    bucket: "uploads",
    object: "a.pdf",
    method: "PUT",
    contentType: "application/pdf",
  }, ctx) as Record<string, unknown>;
  assertEquals(result.signedHeaders, ["content-type", "host"]);
  assertEquals(
    new URL(String(result.url)).searchParams.get("X-Goog-SignedHeaders"),
    "content-type;host",
  );
});

/** A longer URL signs fine and is refused when somebody uses it. */
Deno.test("object-signed-url: refuses more than seven days", async () => {
  const { ctx, calls } = mockCtx([], { display });
  let message = "";
  try {
    await action.execute({ bucket: "uploads", object: "a.pdf", expiresIn: 604801 }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/maximum for a V4 signed URL/.test(message), message);
  assertEquals(calls.length, 0, "nothing was signed");
});

/** No Cloud Storage role grants the signing permission. */
Deno.test("object-signed-url: a 403 from signBlob names the role that is missing", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: { message: "Permission denied" } } }], {
    display,
  });
  let message = "";
  try {
    await action.execute({ bucket: "uploads", object: "a.pdf" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/Service Account Token Creator/.test(message), message);
});

Deno.test("object-signed-url: a connection with no recorded email says to reconnect", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  let message = "";
  try {
    await action.execute({ bucket: "uploads", object: "a.pdf" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/no service-account email recorded/.test(message), message);
  assertEquals(calls.length, 0);
});

/** A run log is exactly where a bearer credential should not end up. */
Deno.test("object-signed-url: never logs the URL it minted", async () => {
  const { ctx, logs } = mockCtx([signed], { display });
  await action.execute({ bucket: "uploads", object: "a.pdf" }, ctx);
  const line = JSON.stringify(logs[0]);
  assertEquals(line.includes("X-Goog-Signature"), false);
  assertEquals(line.includes("deadbeef"), false);
  assertEquals(logs[0].data, { bucket: "uploads", method: "GET", expiresIn: 900 });
});
