import { authApi } from "@/lib/api";

/**
 * Captures the signed-in user's location for the vote-density map. Prefers precise browser
 * coordinates; if the user declines the permission (or it's unavailable), it still calls the
 * API with no coordinates so the server can fall back to approximate IP-based geolocation.
 * Best-effort throughout — never blocks the login/registration flow.
 */
export function captureAndSaveLocation(): Promise<void> {
  return new Promise((resolve) => {
    const saveViaIp = () => authApi.saveLocation().catch(() => {}).finally(() => resolve());

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      saveViaIp();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        authApi
          .saveLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          .catch(() => {})
          .finally(() => resolve());
      },
      // Denied or errored → fall back to server-side IP geolocation.
      () => saveViaIp(),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  });
}
