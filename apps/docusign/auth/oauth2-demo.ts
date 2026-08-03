/**
 * The developer-environment twin of `auth/oauth2.ts`.
 *
 * Docusign's demo and production systems are separate installations, not two
 * modes of one: separate accounts, separate integration keys, separate
 * authentication host (`account-d.docusign.com`) and separate API host
 * (`demo.docusign.net`). Nothing created in one is visible in the other.
 *
 * It exists as a second auth method rather than a form field because
 * `OAuth2Config.authorizationUrl` / `tokenUrl` are static strings in this spec
 * and the environment has to be settled before the browser redirect. See the
 * factory's doc comment in `auth/oauth2.ts` for the full flow, the endpoint
 * citations and the scope reasoning — everything except the host is identical.
 */
import { createDocusignOAuth } from "./oauth2.ts";

export default createDocusignOAuth("demo");
