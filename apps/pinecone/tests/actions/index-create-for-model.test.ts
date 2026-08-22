import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-create-for-model.ts";

/** field_map is what tells Pinecone which of YOUR fields to embed. */
Deno.test("index-create-for-model: the text field becomes field_map.text", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { name: "docs" } }]);
  await action.execute!({
    name: "docs",
    cloud: "aws",
    region: "us-east-1",
    model: "multilingual-e5-large",
    textField: "chunk_text",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(new URL(calls[0].url).pathname, "/indexes/create-for-model");
  assertEquals(sent.embed.field_map, { text: "chunk_text" });
  assertEquals(sent.embed.model, "multilingual-e5-large");
  // The model decides both, so neither may be sent.
  assertEquals("dimension" in sent, false);
});

Deno.test("index-create-for-model: model and text field are both required", async () => {
  const noModel = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!({ name: "d", cloud: "aws", region: "r", textField: "t" }, noModel.ctx),
    Error,
    "model",
  );
  const noField = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!({ name: "d", cloud: "aws", region: "r", model: "m" }, noField.ctx),
    Error,
    "textField",
  );
  assertEquals(noModel.calls.length + noField.calls.length, 0);
});

Deno.test("index-create-for-model: the model hint says it is permanent", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) =>
    p.key === "model"
  )!;
  assert(/Permanent/i.test(p.hint!), p.hint);
});
