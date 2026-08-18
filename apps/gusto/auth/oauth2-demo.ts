/**
 * The demo-environment twin of `auth/oauth2.ts`.
 *
 * Gusto's demo and production systems are separate installations, not two modes
 * of one: separate accounts, separate developer apps, separate credentials and
 * separate hosts (`api.gusto-demo.com` against `api.gusto.com`). Nothing
 * created in one is visible in the other, which makes the demo environment the
 * only safe place to develop a payroll integration.
 *
 * It exists as a second auth method rather than a form field because
 * `OAuth2Config.authorizationUrl` / `tokenUrl` are static strings in this spec
 * and the environment has to be settled before the browser redirect. See the
 * factory's doc comment in `auth/oauth2.ts` for the flow, the measured endpoint
 * behaviour and the single-use refresh token — everything except the host is
 * identical.
 */
import { createGustoOAuth } from "./oauth2.ts";

export default createGustoOAuth("demo");
