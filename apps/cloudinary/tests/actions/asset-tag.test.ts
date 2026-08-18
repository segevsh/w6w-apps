import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-tag.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("asset-tag: add sends the tag, the command and the ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { public_ids: ["a"] } }], conn);
  await action.execute!({ tag: "vip", command: "add", publicIds: "a,b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/image/tags");
  const sent = new URLSearchParams(calls[0].body!);
  assertEquals(sent.get("tag"), "vip");
  assertEquals(sent.get("command"), "add");
  assertEquals(sent.getAll("public_ids[]"), ["a", "b"]);
});

/** `replace` drops every other tag on the listed assets. */
Deno.test("asset-tag: replace needs confirming", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ tag: "x", command: "replace", publicIds: "a" }, ctx),
    Error,
    "confirm",
  );
  assertEquals(calls.length, 0);
});

/** `remove_all` ignores the id list and touches the whole account. */
Deno.test("asset-tag: remove_all needs confirming, and says why", async () => {
  const { ctx } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ tag: "x", command: "remove_all" }, ctx),
    Error,
  );
  assert(/EVERY asset/.test(String(err)), String(err));
});

Deno.test("asset-tag: remove_all works without a public-id list once confirmed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ tag: "x", command: "remove_all", confirm: true }, ctx);
  const sent = new URLSearchParams(calls[0].body!);
  assertEquals(sent.get("command"), "remove_all");
  assertEquals(sent.getAll("public_ids[]"), []);
});

Deno.test("asset-tag: add without ids is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ tag: "x", command: "add" }, ctx),
    Error,
    "publicIds",
  );
});
