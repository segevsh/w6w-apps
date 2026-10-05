/**
 * Plaud — the Plaud Dev API ("Plaud Embedded"): device binding registry, audio upload to
 * Plaud storage, and asynchronous transcription, at `platform-<region>.plaud.ai/developer/api`.
 *
 * Every path, field and credential style here comes from the OpenAPI documents published at
 * docs.plaud.ai/openapi/{auth,binding,file,transcription}.json and was probed against the live
 * US and Japan hosts on 2026-10-05.
 *
 * Out of scope: the on-device (Bluetooth) half of binding and recording, which only the mobile
 * Embedded SDK can do; the S3 chunk PUTs of an upload; and Plaud's MCP / CLI, which read a
 * personal Plaud account's recordings through its own sign-in, not a partner credential.
 */
import type { AppDefinition } from "@w6w/types";
import deviceBind from "./actions/device-bind.ts";
import deviceUnbind from "./actions/device-unbind.ts";
import deviceBindingGet from "./actions/device-binding-get.ts";
import uploadPresign from "./actions/upload-presign.ts";
import uploadComplete from "./actions/upload-complete.ts";
import transcriptionSubmit from "./actions/transcription-submit.ts";
import transcriptionGet from "./actions/transcription-get.ts";
import credentials from "./auth/credentials.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

const app: AppDefinition = {
  actions: [
    deviceBind,
    deviceUnbind,
    deviceBindingGet,
    uploadPresign,
    uploadComplete,
    transcriptionSubmit,
    transcriptionGet,
  ],
  auth: [credentials],
  healthChecks: [service, quota],
};

export default app;
