import type { ActionDefinition } from "@w6w/types";
import { compact, HuggingFaceClient } from "../lib/client.ts";

/**
 * `POST /api/repos/create` — make a repository.
 *
 * ## Public is the default, and it is the wrong default for a workflow
 *
 * The Hub's own default is public, which for a repository created by an
 * automation holding a token is almost never what was meant — a model produced
 * by a training job, a dataset assembled from internal data, an evaluation
 * artefact. This action defaults to **private** and says so.
 *
 * ## The namespace is not implied by the token
 *
 * A token can create under its own user or under any organisation the user
 * belongs to, and leaving `organization` blank means the user. `whoami` lists
 * the organisations, and creating in the wrong place is a move-and-relink job
 * rather than a rename.
 *
 * ## The type is fixed at creation
 *
 * `model`, `dataset` or `space`. They are the same object underneath but the
 * Hub treats them differently everywhere afterwards, and there is no converting
 * one into another.
 */
const action: ActionDefinition = {
  key: "repo-create",
  type: "perform",
  resource: "repository",
  title: "Create a repository",
  description:
    "Create a model, dataset or Space repository. This defaults to PRIVATE, unlike the Hub — a " +
    "repository an automation creates is rarely meant to be public.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "Just the name, without the namespace — that is the field below.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "model",
      options: [
        { value: "model", label: "Model" },
        { value: "dataset", label: "Dataset" },
        { value: "space", label: "Space" },
      ],
      hint: "Fixed at creation — there is no converting one type into another.",
    },
    {
      key: "organization",
      label: "Organisation",
      type: "string",
      default: "",
      hint: "Blank creates under the token's own user. `whoami` lists the organisations it can " +
        "act in.",
    },
    {
      key: "private",
      label: "Private",
      type: "boolean",
      default: true,
      hint: "On by default, against the Hub's own default. Turning it off publishes to everyone.",
    },
    {
      key: "sdk",
      label: "Space SDK",
      type: "select",
      default: "",
      showIf: { "==": [{ var: "type" }, "space"] },
      options: [
        { value: "gradio", label: "Gradio" },
        { value: "streamlit", label: "Streamlit" },
        { value: "docker", label: "Docker" },
        { value: "static", label: "Static" },
      ],
      hint: "Required for a Space, and meaningless for anything else.",
    },
  ],
  output: [
    { key: "url", type: "string", label: "The repository's URL" },
    { key: "id", type: "string", label: "Its `namespace/name` id" },
    { key: "type", type: "string", label: "What was created" },
    { key: "private", type: "boolean", label: "Whether it is private" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    if (name.includes("/")) {
      throw new Error(
        "`name` should not include the namespace — give the owner in `organization`, or leave " +
          "it blank to create under the token's own user",
      );
    }

    const type = String(p.type ?? "model");
    const isPrivate = p.private !== false;
    if (type === "space" && !String(p.sdk ?? "").trim()) {
      throw new Error("`sdk` is required for a Space — gradio, streamlit, docker or static");
    }

    const result = await new HuggingFaceClient(ctx).request<{ url?: string; name?: string }>(
      "/api/repos/create",
      {
        method: "POST",
        body: compact({
          name,
          type,
          organization: p.organization,
          private: isPrivate,
          sdk: type === "space" ? p.sdk : undefined,
        }),
      },
    );

    if (!isPrivate) {
      ctx.log("warn", "created a PUBLIC Hugging Face repository — it is visible to everyone", {
        type,
      });
    } else {
      ctx.log("info", "created a Hugging Face repository", { type });
    }

    return {
      url: result?.url,
      id: result?.name,
      type,
      private: isPrivate,
    };
  },
};

export default action;
