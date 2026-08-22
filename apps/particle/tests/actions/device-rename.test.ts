import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-rename.ts";

const ID = "0123456789abcdef01234567";

Deno.test("device-rename: PUTs the changed fields as a form", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { name: "roof-sensor", notes: "north wall" },
  }]);
  const result = await action.execute(
    { deviceId: ID, name: "roof-sensor", notes: "north wall" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("name"), "roof-sensor");
  assertEquals(form.get("notes"), "north wall");
  assertEquals(result.changed, ["name", "notes"]);
});

Deno.test("device-rename: only what was given is sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "x" } }]);
  await action.execute({ deviceId: ID, name: "x" }, ctx);
  assertEquals(calls[0].body, "name=x");
});

Deno.test("device-rename: a call with nothing to change is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ deviceId: ID }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/nothing to change/.test(message), message);
  assertEquals(calls.length, 0);
});

/** The opposite of most systems, where a rename breaks references. */
Deno.test("device-rename: says renaming breaks nothing", () => {
  assert(/Renaming breaks nothing/.test(action.description!), action.description);
  const notes = action.params!.find((p) => p.key === "notes")!;
  assert(/where it physically is/.test(notes.hint!), notes.hint);
  assertEquals(action.idempotent, true);
});
