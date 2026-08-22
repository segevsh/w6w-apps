import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/repo-create.ts";

const created = {
  status: 200,
  body: { url: "https://huggingface.co/acme/scores", name: "acme/scores" },
};

/** The Hub's own default is public, which an automation rarely means. */
Deno.test("repo-create: defaults to private, against the Hub", async () => {
  const { ctx, calls } = mockCtx([created]);
  const result = await action.execute({ name: "scores", type: "model" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(JSON.parse(calls[0].body!).private, true);
  assertEquals(result.private, true);
  assertEquals(action.params!.find((p) => p.key === "private")!.default, true);
  assert(/defaults to PRIVATE/.test(action.description!), action.description);
});

Deno.test("repo-create: posts to the create endpoint and returns the URL and id", async () => {
  const { ctx, calls } = mockCtx([created]);
  const result = await action.execute({ name: "scores", type: "dataset" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, "https://huggingface.co/api/repos/create");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.url, "https://huggingface.co/acme/scores");
  assertEquals(result.id, "acme/scores");
  assertEquals(result.type, "dataset");
});

/** A token can create under the user or under any of its organisations. */
Deno.test("repo-create: the namespace is explicit, not implied by the token", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute({ name: "scores", type: "model", organization: "acme" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).organization, "acme");

  const own = mockCtx([created]);
  await action.execute({ name: "scores", type: "model" }, own.ctx);
  assertEquals("organization" in JSON.parse(own.calls[0].body!), false);
});

/** Creating in the wrong place is a move-and-relink job, not a rename. */
Deno.test("repo-create: a namespaced name is refused, pointing at the right field", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ name: "acme/scores", type: "model" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/should not include the namespace/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("repo-create: a Space needs an SDK, and other types do not", async () => {
  const missing = mockCtx([]);
  let message = "";
  try {
    await action.execute({ name: "demo", type: "space" }, missing.ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`sdk` is required for a Space/.test(message), message);
  assertEquals(missing.calls.length, 0);

  const withSdk = mockCtx([created]);
  await action.execute({ name: "demo", type: "space", sdk: "gradio" }, withSdk.ctx);
  assertEquals(JSON.parse(withSdk.calls[0].body!).sdk, "gradio");

  const model = mockCtx([created]);
  await action.execute({ name: "m", type: "model", sdk: "gradio" }, model.ctx);
  assertEquals("sdk" in JSON.parse(model.calls[0].body!), false);
});

/** Turning it off publishes to everyone, which is worth a line in the log. */
Deno.test("repo-create: creating a public repository logs a warning", async () => {
  const publicRepo = mockCtx([created]);
  await action.execute({ name: "scores", type: "model", private: false }, publicRepo.ctx);
  assertEquals(publicRepo.logs[0].level, "warn");
  assert(/visible to everyone/.test(publicRepo.logs[0].message), publicRepo.logs[0].message);

  const privateRepo = mockCtx([created]);
  await action.execute({ name: "scores", type: "model" }, privateRepo.ctx);
  assertEquals(privateRepo.logs[0].level, "info");
});

Deno.test("repo-create: a name is required and creates nothing without one", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ type: "model" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`name` is required/.test(message), message);
  assertEquals(calls.length, 0);
});

/** There is no converting one type into another. */
Deno.test("repo-create: the type hint says it is fixed at creation", () => {
  const type = action.params!.find((p) => p.key === "type")!;
  assert(/no converting one type into another/.test(type.hint!), type.hint);
  assertEquals(action.idempotent, false);
});
