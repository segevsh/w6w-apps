import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient, encodePath } from "../lib/client.ts";
import { pathParam } from "../lib/params.ts";

interface Input {
  path: string;
  lockToken: string;
}

const fileUnlock: ActionDefinition<Input> = {
  key: "file-unlock",
  type: "perform",
  resource: "file",
  title: "Unlock File",
  description: "Release a lock previously taken with Lock File.",
  idempotent: true,
  params: [
    pathParam("Full path of the locked file."),
    { key: "lockToken", label: "Lock token", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Unlocked" }],

  async execute(input, ctx) {
    await new EgnyteClient(ctx).request(`/v1/fs/${encodePath(input.path)}`, {
      method: "POST",
      body: { action: "unlock", lock_token: input.lockToken },
    });
    return { success: true };
  },
};

export default fileUnlock;
