import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, seg } from "../lib/client.ts";

interface Input {
  containerId: string;
}

interface Output {
  id: string;
  status_code: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
  status?: string;
}

/**
 * Check a container's publishing status — `GET /{ig-container-id}?fields=status_code,status`.
 * `status_code` is one of EXPIRED (not published within 24 h), ERROR, FINISHED
 * (ready to publish), IN_PROGRESS, PUBLISHED; on ERROR, `status` carries the error
 * subcode. Meta recommends polling about once a minute for at most 5 minutes.
 */
const getContainerStatus: ActionDefinition<Input, Output> = {
  key: "get-container-status",
  type: "read",
  resource: "media",
  title: "Get Container Status",
  description: "Check whether a media container is ready to publish (status_code FINISHED).",
  params: [{ key: "containerId", label: "Container ID", type: "string", required: true }],
  output: [
    { key: "status_code", type: "string", label: "Status code" },
    { key: "status", type: "string", label: "Status detail" },
  ],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<Output>(`/${seg(input.containerId)}`, {
      params: { fields: "status_code,status" },
    });
  },
};

export default getContainerStatus;
