import type { AppDefinition } from "@w6w/types";
import secretToken from "./auth/secret-token.ts";

import contractCreate from "./actions/contract-create.ts";
import contractGet from "./actions/contract-get.ts";
import contractWithdraw from "./actions/contract-withdraw.ts";
import contractSendDraft from "./actions/contract-send-draft.ts";
import contractPdfPreview from "./actions/contract-pdf-preview.ts";
import contractContentGet from "./actions/contract-content-get.ts";
import contractContentUpdate from "./actions/contract-content-update.ts";
import contractPlaceholdersGet from "./actions/contract-placeholders-get.ts";
import contractPlaceholdersUpdate from "./actions/contract-placeholders-update.ts";
import signerAdd from "./actions/signer-add.ts";
import signerUpdate from "./actions/signer-update.ts";
import signerResend from "./actions/signer-resend.ts";
import signerDelete from "./actions/signer-delete.ts";
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import templateCreate from "./actions/template-create.ts";
import templateUpdate from "./actions/template-update.ts";
import templateDuplicate from "./actions/template-duplicate.ts";
import templateDelete from "./actions/template-delete.ts";
import templateContentGet from "./actions/template-content-get.ts";
import templateContentUpdate from "./actions/template-content-update.ts";
import collaboratorAdd from "./actions/collaborator-add.ts";
import collaboratorList from "./actions/collaborator-list.ts";
import collaboratorRemove from "./actions/collaborator-remove.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";

export default {
  actions: [
    contractCreate,
    contractGet,
    contractWithdraw,
    contractSendDraft,
    contractPdfPreview,
    contractContentGet,
    contractContentUpdate,
    contractPlaceholdersGet,
    contractPlaceholdersUpdate,
    signerAdd,
    signerUpdate,
    signerResend,
    signerDelete,
    templateList,
    templateGet,
    templateCreate,
    templateUpdate,
    templateDuplicate,
    templateDelete,
    templateContentGet,
    templateContentUpdate,
    collaboratorAdd,
    collaboratorList,
    collaboratorRemove,
  ],
  // Secret Token over HTTP Basic only. eSignatures publishes no OAuth surface.
  auth: [secretToken],
  healthChecks: [service, api],
} satisfies AppDefinition;
