import { assertEquals, assertRejects } from "@std/assert";
import tileUpdate from "../../actions/tile-update.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("tile-update: PUT /v1/notes/n1/tiles/t1 with the documented parameters", async () => {
  const response = { url: "https://x.slite.com/n1#t1" };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await tileUpdate.execute({
    noteId: "n1",
    tileId: "t1",
    title: "P",
    statusLabel: "In progress",
    statusColor: "#fcc93c",
    content: "- [ ] x",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/notes/n1/tiles/t1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    title: "P",
    content: "- [ ] x",
    status: { label: "In progress", colorHex: "#fcc93c" },
  });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("tile-update: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () =>
      await tileUpdate.execute({
        noteId: "n1",
        tileId: "t1",
        title: "P",
        statusLabel: "In progress",
        statusColor: "#fcc93c",
        content: "- [ ] x",
      }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("tile-update: a malformed colour, or a colour without a label, is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await tileUpdate.execute(
        { noteId: "n", tileId: "t", statusLabel: "x", statusColor: "red" },
        ctx,
      ),
    Error,
    "#rrggbb",
  );
  await assertRejects(
    async () => await tileUpdate.execute({ noteId: "n", tileId: "t", statusColor: "#aabbcc" }, ctx),
    Error,
    "statusLabel",
  );
  assertEquals(calls.length, 0);
});
