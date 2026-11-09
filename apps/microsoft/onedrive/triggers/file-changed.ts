import type { TriggerDefinition } from "@w6w/types";
import { pollToken } from "../../_shared/poll/mod.ts";
import listChanges from "../actions/list-changes.ts";

interface Params {
  driveId?: string;
}

interface DriveItem {
  id?: string;
  name?: string;
  lastModifiedDateTime?: string;
  deleted?: unknown;
}

async function deltaLink(
  params: Params,
  token: "latest" | string,
  ctx: Parameters<NonNullable<typeof listChanges.execute>>[1],
) {
  const result = await listChanges.execute(
    token === "latest"
      ? { driveId: params.driveId, token, top: 100, all: false }
      : { driveId: params.driveId, deltaLink: token, top: 100, all: false },
    ctx,
  );
  if (!result.deltaLink) {
    throw new Error("OneDrive delta response did not contain a delta link; reduce the page size.");
  }
  return result;
}

const trigger: TriggerDefinition<Params, DriveItem> = {
  key: "file-changed",
  title: "File Changed",
  description: "Fires when Microsoft Graph delta reports a change in a drive.",
  params: [{ key: "driveId", label: "Drive ID", type: "string" }],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "lastModifiedDateTime", type: "string", label: "Modified at" },
  ],
  sample: {
    id: "01ABCDEF",
    name: "Report.docx",
    lastModifiedDateTime: "2026-11-09T12:00:00Z",
  },
  async poll({ params, state }, ctx) {
    return await pollToken<DriveItem>({
      state,
      seed: async () => (await deltaLink(params, "latest", ctx)).deltaLink!,
      changes: async (token) => {
        const result = await deltaLink(params, token, ctx);
        return { items: result.value, nextToken: result.deltaLink! };
      },
      maxEvents: 100,
    });
  },
};

export default trigger;
