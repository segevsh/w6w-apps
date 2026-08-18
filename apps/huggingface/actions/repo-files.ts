import type { ActionDefinition } from "@w6w/types";
import { HuggingFaceClient, query, repoId } from "../lib/client.ts";

/**
 * `GET /api/{kind}/{id}/tree/{revision}` — what is actually in a repository.
 *
 * ## The file list is how you tell a safe model from a pickle
 *
 * A repository shipping `model.safetensors` can be loaded without executing
 * anything. One shipping only `pytorch_model.bin` is a Python pickle, and
 * loading it runs whatever is in it. That distinction is invisible from the
 * model card and visible here, so this action flags it.
 *
 * ## `lfs` is where the size is
 *
 * Large files are stored in LFS and their real size is in `lfs.size`, not
 * `size` — which for an LFS pointer is the size of the *pointer*, around 130
 * bytes. Summing `size` across a repository gives a total that is wrong by
 * several orders of magnitude, and looks plausible.
 *
 * ## The default branch moves
 *
 * `main` is a moving target: a repository can be updated at any time, and a
 * workflow pinned to `main` gets different weights on different days without
 * anything changing on its side. A commit SHA is the only reproducible pin.
 */
const action: ActionDefinition = {
  key: "repo-files",
  type: "read",
  resource: "file",
  title: "List a repository's files",
  description:
    "What a repository actually contains. Real sizes are in `lfs.size` — a large file's `size` " +
    "is the size of its LFS POINTER, about 130 bytes, and summing those looks plausible.",
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
      placeholder: "openai-community/gpt2",
    },
    {
      key: "revision",
      label: "Revision",
      type: "string",
      default: "main",
      hint: "`main` MOVES — a repository updated tomorrow gives different files. Pin a commit " +
        "SHA for anything reproducible.",
    },
    {
      key: "path",
      label: "Path",
      type: "string",
      default: "",
      hint: "A subdirectory. Blank lists the root, which is not recursive.",
    },
    {
      key: "recursive",
      label: "Recursive",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "files", type: "array", label: "The entries" },
    { key: "count", type: "number", label: "How many" },
    { key: "totalBytes", type: "number", label: "Real size, taking LFS entries from `lfs.size`" },
    { key: "paths", type: "array", label: "Just the paths" },
    { key: "hasSafetensors", type: "boolean", label: "Loadable without executing anything" },
    { key: "hasPickle", type: "boolean", label: "Ships a .bin or .pt — loading one runs code" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const kind = String(p.kind ?? "models");
    const id = repoId(p.id, "id");
    const revision = String(p.revision ?? "main").trim() || "main";
    const path = String(p.path ?? "").trim().replace(/^\/+/, "");

    const files = await new HuggingFaceClient(ctx).request<
      Array<{ path?: string; size?: number; type?: string; lfs?: { size?: number } }>
    >(
      `/api/${kind}/${id}/tree/${encodeURIComponent(revision)}${path ? `/${path}` : ""}`,
      { query: query({ recursive: p.recursive === true ? true : undefined }) },
    );

    const list = Array.isArray(files) ? files : [];
    // An LFS entry's `size` is the pointer's, around 130 bytes — the real one
    // is in `lfs.size`, and summing the wrong field looks entirely plausible.
    const totalBytes = list.reduce(
      (sum, file) => sum + Number(file?.lfs?.size ?? file?.size ?? 0),
      0,
    );
    const paths = list.map((file) => String(file?.path ?? "")).filter(Boolean);

    return {
      files: list,
      count: list.length,
      totalBytes,
      paths,
      hasSafetensors: paths.some((entry) => entry.endsWith(".safetensors")),
      // Loading one of these executes whatever is pickled inside it.
      hasPickle: paths.some((entry) => entry.endsWith(".bin") || entry.endsWith(".pt")),
    };
  },
};

export default action;
