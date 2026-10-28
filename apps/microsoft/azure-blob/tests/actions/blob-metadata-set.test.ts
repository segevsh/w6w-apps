import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blob-metadata-set.ts";

const D = { display: { account: "myaccount" } };
const existing = (names: string[]) => ({
  status: 200,
  body: "",
  headers: Object.fromEntries(names.map((n) => [`x-ms-meta-${n}`, "v"])),
});
const written = { status: 200, body: "", headers: { etag: '"0x8E"' } };

Deno.test("blob-metadata-set: PUTs comp=metadata with x-ms-meta headers", async () => {
  const { ctx, calls } = mockCtx([existing([]), written], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", metadata: '{"owner":"jane"}' },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(calls[1].url).searchParams.get("comp"), "metadata");
  assertEquals(calls[1].headers["x-ms-meta-owner"], "jane");
  assertEquals(result.etag, '"0x8E"');
});

/** There is no merge; what disappears is worth reporting. */
Deno.test("blob-metadata-set: reports the names it removed", async () => {
  const { ctx, logs } = mockCtx([existing(["owner", "team"]), written], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", metadata: '{"owner":"jane"}' },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.removed, ["team"]);
  assertEquals(logs[0].level, "warn");
  assert(/removed names that were set before/.test(logs[0].message), logs[0].message);
});

Deno.test("blob-metadata-set: replacing like for like removes nothing", async () => {
  const { ctx, logs } = mockCtx([existing(["owner"]), written], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", metadata: '{"owner":"someone-else"}' },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.removed, []);
  assertEquals(logs.length, 0);
});

/** Azure lowercases the names, so the comparison has to. */
Deno.test("blob-metadata-set: a case difference is not a removal", async () => {
  const { ctx } = mockCtx([existing(["uploadedby"]), written], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", metadata: '{"uploadedBy":"jane"}' },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.removed, []);
});

/** An empty object is how the whole set is cleared. */
Deno.test("blob-metadata-set: an empty object clears everything and says so", async () => {
  const { ctx, calls } = mockCtx([existing(["owner", "team"]), written], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", metadata: "{}" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.removed, ["owner", "team"]);
  assertEquals(
    Object.keys(calls[1].headers).some((h) => h.startsWith("x-ms-meta-")),
    false,
    "no metadata headers at all",
  );
});

Deno.test("blob-metadata-set: a hyphenated name is refused before sending", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute(
      { container: "uploads", blob: "a.log", metadata: '{"uploaded-by":"x"}' },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/not a valid C# identifier/.test(message), message);
  assert(/catches most names copied from elsewhere/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("blob-metadata-set: metadata must be an object", async () => {
  for (const bad of [undefined, "", '["a"]']) {
    const { ctx, calls } = mockCtx([], D);
    let message = "";
    try {
      await action.execute({ container: "uploads", blob: "a.log", metadata: bad }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/must be an object/.test(message), `${bad}: ${message}`);
    assertEquals(calls.length, 0);
  }
});

/** Visible to anyone who can read the blob's properties. */
Deno.test("blob-metadata-set: says metadata is not a place for secrets", () => {
  const param = action.params!.find((p) => p.key === "metadata")!;
  assert(/Not a place for secrets/.test(param.hint!), param.hint);
});
