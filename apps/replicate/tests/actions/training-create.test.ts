import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/training-create.ts";

const BASE = { model: "ostris/flux-dev-lora-trainer", versionId: "v1", input: '{"steps":1000}' };

Deno.test("training-create: POSTs to the trainer version's trainings path", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "t1", status: "starting" } }]);
  await action.execute!({ ...BASE, destination: "acme/my-model" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/v1/trainings",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.destination, "acme/my-model");
  assertEquals(body.input, { steps: 1000 });
});

/** The most expensive call in the app. */
Deno.test("training-create: logs at warn and is not idempotent", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ ...BASE, destination: "acme/my-model" }, ctx);
  assertEquals(logs[0].level, "warn");
  assertEquals(action.idempotent, false);
});

/** The destination must be owner/name, and must already exist. */
Deno.test("training-create: a malformed destination is caught locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ ...BASE, destination: "my-model" }, ctx),
    Error,
    'should be "owner/name"',
  );
  assertEquals(calls.length, 0);
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "destination")!;
  assert(param.hint!.includes("must EXIST already"), param.hint);
});

Deno.test("training-create: the version and input are required", async () => {
  const noVersion = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        { model: BASE.model, input: "{}", destination: "a/b" },
        noVersion.ctx,
      ),
    Error,
    "`versionId` is required",
  );
  assertEquals(noVersion.calls.length, 0);
});
