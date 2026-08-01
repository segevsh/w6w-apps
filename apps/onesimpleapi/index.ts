import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import getPageInfo from "./actions/get-page-info.ts";
import takeScreenshot from "./actions/take-screenshot.ts";
import createPdf from "./actions/create-pdf.ts";
import generateQrCode from "./actions/generate-qr-code.ts";
import validateEmail from "./actions/validate-email.ts";
import expandUrl from "./actions/expand-url.ts";
import convertCurrency from "./actions/convert-currency.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    getPageInfo,
    takeScreenshot,
    createPdf,
    generateQrCode,
    validateEmail,
    expandUrl,
    convertCurrency,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
