import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ListChecks, Loader2, UserRound } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ImageUploadField } from "@/components/ImageUploadField";
import { useAuth } from "@/lib/auth";
import { authApi, ApiError } from "@/lib/api";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — FansBench" },
      { name: "description", content: "Manage your FansBench account." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading, refresh, logout } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [mpesaPhone, setMpesaPhone] = useState(user?.mpesa_phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirmingDeletion, setConfirmingDeletion] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  if (loading) return null;

  if (!user) {
    return (
      <AppLayout>
        <div className="fb-card p-6 text-sm text-muted-foreground">
          <Link to="/login" search={{ redirect: "/profile" }} className="font-semibold text-primary hover:underline">
            Sign in
          </Link>{" "}
          to view your profile.
        </div>
      </AppLayout>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFlash(null);
    try {
      await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        mpesa_phone: mpesaPhone.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      await refresh();
      setFlash("Profile updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function requestDeletion() {
    setRequestingDeletion(true);
    setDeletionError(null);
    try {
      await authApi.requestDeletion();
      await refresh();
      setConfirmingDeletion(false);
    } catch (err) {
      setDeletionError(err instanceof ApiError ? err.message : "Couldn't submit your request.");
    } finally {
      setRequestingDeletion(false);
    }
  }

  return (
    <AppLayout>
      <div className="mb-4 flex items-center gap-2">
        <UserRound className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Your profile</h1>
      </div>

      <Link to="/voting-history" className="fb-card fb-card-hover mb-4 flex items-center gap-3 p-4">
        <ListChecks className="h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground">View your voting history</p>
          <p className="text-xs text-muted-foreground">Every vote you've cast, and its verification status.</p>
        </div>
      </Link>

      <form onSubmit={save} className="fb-card space-y-4 p-6">
        <ImageUploadField
          label="Photo"
          value={avatarUrl}
          onChange={(url) => setAvatarUrl(url ?? "")}
          fallbackIcon={<UserRound className="h-4 w-4" />}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">First name</label>
            <input className="fb-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Last name</label>
            <input className="fb-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input className="fb-input" value={user.email} disabled />
          <p className="mt-1 text-xs text-muted-foreground">Contact support to change your email.</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Phone</label>
          <input className="fb-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">M-Pesa number for voting</label>
          <input
            className="fb-input"
            value={mpesaPhone}
            onChange={(e) => setMpesaPhone(e.target.value)}
            placeholder="Defaults to your phone number if left blank"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {flash && <p className="text-sm text-success">{flash}</p>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </button>
      </form>

      <div className="fb-card mt-4 border-destructive/30 p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-bold text-foreground">Delete account</h2>
        </div>
        {user.deletion_requested_at ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Your deletion request is pending admin review. You can keep using your account until then.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Requests to delete your account are reviewed by an admin before your data is
              removed. You can keep voting until it's approved.
            </p>
            {!confirmingDeletion ? (
              <button
                type="button"
                onClick={() => setConfirmingDeletion(true)}
                className="btn-outline mt-3 !border-destructive !text-destructive"
              >
                Request account deletion
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-foreground">Are you sure?</p>
                {deletionError && <p className="text-sm text-destructive">{deletionError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmingDeletion(false)} className="btn-ghost">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={requestDeletion}
                    disabled={requestingDeletion}
                    className="btn-primary !bg-destructive"
                  >
                    {requestingDeletion && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm request
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          logout();
          navigate({ to: "/" });
        }}
        className="btn-ghost mt-4"
      >
        Sign out
      </button>
    </AppLayout>
  );
}
