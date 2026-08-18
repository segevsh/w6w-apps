import type { ActionDefinition } from "@w6w/types";
import { HUB, HuggingFaceClient, repoId } from "../lib/client.ts";

/**
 * `GET /{id}/resolve/{revision}/{path}` — a file's contents.
 *
 * ## This is for configuration, not for weights
 *
 * `config.json`, `tokenizer_config.json`, a README, a small CSV — the files a
 * workflow reads to decide something. Model weights are gigabytes, they are the
 * reason LFS exists, and pulling one through a workflow's data would be a
 * mistake this action refuses to help with: there is a size ceiling and it is
 * deliberately low.
 *
 * ## A gated repository fails here and nowhere else
 *
 * The metadata of a gated model reads fine without any credential — verified
 * live against `meta-llama/Llama-3.1-8B`. Its files do not. So this is the
 * action where a gate is actually felt, and the 403 it produces cannot be
 * fixed by any token: somebody has to accept the terms in the web interface.
 *
 * ## Pin a revision for anything that matters
 *
 * `main` moves. A workflow reading a model's `config.json` from `main` reads a
 * different file after the author pushes, with nothing to indicate it changed.
 */
const MAX_BYTES = 2_000_000;

const action: ActionDefinition = {
  key: "file-download",
  type: "read",
  resource: "file",
  title: "Read a repository file",
  description:
    "Read a file's contents — configuration and small data, not weights. A GATED repository " +
    "fails here even though its metadata reads fine, and no token can accept a gate.",
  params: [
    {
      key: "kind",
      label: "Kind",
      type: "select",
      default: "models",
      options: [
        { value: "models", label: "Model" },
        { value: "datasets", label: "Dataset" },
        { value: "spaces", label: "Space" },
      ],
    },
    {
      key: "id",
      label: "Repository",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "path",
      label: "File",
      type: "string",
      required: true,
      default: "",
      placeholder: "config.json",
      hint: "The path within the repository, from `repo-files`.",
    },
    {
      key: "revision",
      label: "Revision",
      type: "string",
      default: "main",
      hint: "Pin a commit SHA for anything reproducible — `main` moves.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "The file, as text" },
    { key: "json", type: "object", label: "The same parsed, when it is JSON" },
    { key: "size", type: "number", label: "Bytes" },
    { key: "path", type: "string", label: "What was read" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const kind = String(p.kind ?? "models");
    const id = repoId(p.id, "id");
    const path = String(p.path ?? "").trim().replace(/^\/+/, "");
    const revision = String(p.revision ?? "main").trim() || "main";
    if (!path) throw new Error("`path` is required");

    // Datasets and Spaces carry a prefix in the resolve URL; models do not.
    const prefix = kind === "models" ? "" : `${kind}/`;
    const content = await new HuggingFaceClient(ctx).request<string>(
      `/${prefix}${id}/resolve/${encodeURIComponent(revision)}/${path}`,
      { text: true, host: HUB },
    );

    const text = String(content ?? "");
    const size = new TextEncoder().encode(text).length;
    if (size > MAX_BYTES) {
      throw new Error(
        `the file is ${size} bytes, over the ${MAX_BYTES} ceiling this action applies. Model ` +
          "weights belong in a download, not in a workflow's data — this action is for " +
          "configuration and small files",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch { /* most files are not JSON, which is not an error */ }

    // The path and size only — the contents are the caller's to handle.
    ctx.log("info", "read a Hugging Face repository file", { path, size });

    return { content: text, json: parsed, size, path };
  },
};

export default action;
