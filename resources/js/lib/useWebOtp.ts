import { useEffect } from "react";

/**
 * Auto-fills an OTP straight from an incoming SMS via the WebOTP API, so the user never has
 * to leave the browser to open Messages — supporting browsers (Chrome/Android primarily) show
 * a native "Allow FansBench to read your SMS?" bottom sheet the instant a matching text
 * arrives, then hand the code to `onCode`. Requires the SMS to end with a line the browser
 * recognises (see OtpService::smsText() on the backend) and the page to be served over HTTPS.
 * No-ops silently on unsupported browsers — this is a convenience layer on top of manual
 * entry/paste, never a replacement for it.
 */
export function useWebOtp(onCode: (code: string) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("OTPCredential" in window)) return;

    const controller = new AbortController();

    // WebOTP's `otp` request option and the `code` property it resolves with aren't in the
    // standard lib.dom.d.ts yet, so the whole call is cast through `unknown` rather than
    // fighting navigator.credentials.get()'s narrower built-in Credential typing.
    const getCredential = navigator.credentials.get as (
      options: unknown,
    ) => Promise<{ code?: string } | null>;

    getCredential({ otp: { transport: ["sms"] }, signal: controller.signal })
      .then((credential) => {
        if (credential?.code) onCode(credential.code);
      })
      .catch(() => {
        // AbortError on cleanup, or the user dismissed the prompt — nothing to do either way.
      });

    return () => controller.abort();
  }, [enabled, onCode]);
}
