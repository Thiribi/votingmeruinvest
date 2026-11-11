import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ImageUploadField } from "@/components/ImageUploadField";
import { RowActionsMenu, type RowAction } from "@/components/RowActionsMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  categoriesApi,
  nomineesApi,
  ApiError,
  type Category,
  type Subcategory,
  type Nominee,
} from "@/lib/api";

type NomineesSearch = { new?: boolean };

export const Route = createFileRoute(
  "/admin/categories_/$categoryId/subcategories_/$subcategoryId/nominees",
)({
  validateSearch: (search: Record<string, unknown>): NomineesSearch => ({
    new: search.new === "1" || search.new === "true" || search.new === true,
  }),
  component: SubcategoryNominees,
});

function SubcategoryNominees() {
  const { categoryId, subcategoryId } = Route.useParams();
  const { new: openCreateOnLoad } = Route.useSearch();
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [creating, setCreating] = useState(Boolean(openCreateOnLoad));
  const [editing, setEditing] = useState<Nominee | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Nominee | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<Nominee | null>(null);

  function toast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  function load() {
    setLoading(true);
    Promise.all([
      categoriesApi.get(categoryId, { with_archived: true }),
      nomineesApi.list({ subcategory_id: subcategoryId, per_page: 100, with_archived: true }),
    ])
      .then(([cat, nom]) => {
        setCategory(cat);
        setSubcategory((cat.subcategories ?? []).find((s) => String(s.id) === subcategoryId) ?? null);
        setNominees(nom.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, subcategoryId]);

  async function saveNominee(nominee: Partial<Nominee>) {
    try {
      if (editing) {
        const updated = await nomineesApi.update(editing.id, nominee);
        setNominees((n) => n.map((x) => (x.id === updated.id ? updated : x)));
        toast("Nominee updated");
      } else {
        const created = await nomineesApi.create(subcategoryId, nominee);
        setNominees((n) => [...n, created]);
        toast("Nominee created");
      }
      setCreating(false);
      setEditing(null);
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    }
  }

  async function runArchiveToggle() {
    if (!archiveTarget) return;
    const nominee = archiveTarget;
    setArchiveBusy(true);
    try {
      const updated = nominee.archived_at
        ? await nomineesApi.unarchive(nominee.id)
        : await nomineesApi.archive(nominee.id);
      setNominees((n) => n.map((x) => (x.id === updated.id ? updated : x)));
      toast(nominee.archived_at ? "Nominee restored" : "Nominee archived");
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    } finally {
      setArchiveBusy(false);
      setArchiveTarget(null);
    }
  }

  async function removeNominee(nominee: Nominee) {
    if (!confirm(`Delete nominee "${nominee.name}"?`)) return;
    try {
      await nomineesApi.remove(nominee.id);
      setNominees((n) => n.filter((x) => x.id !== nominee.id));
      toast("Nominee deleted");
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    }
  }

  const filtered = useMemo(
    () => nominees.filter((n) => n.name.toLowerCase().includes(q.toLowerCase())),
    [nominees, q],
  );

  return (
    <AdminLayout
      title={subcategory ? `Nominees — ${subcategory.name}` : "Nominees"}
      actions={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="fb-input w-48 pl-9"
            />
          </div>
          <Link
            to="/admin/categories/$categoryId/subcategories"
            params={{ categoryId }}
            className="btn-ghost"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add nominee
          </button>
        </div>
      }
    >
      {category && subcategory && (
        <p className="mb-4 text-xs text-muted-foreground">
          {category.name} <span className="mx-1">›</span> {subcategory.name}
        </p>
      )}

      {flash && (
        <div className="mb-4 rounded-2xl border border-success bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-4 py-2.5 text-sm text-success">
          {flash}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="fb-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nominee</th>
                <th className="px-4 py-3">Votes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((n) => {
                const archived = Boolean(n.archived_at);
                return (
                <tr
                  key={String(n.id)}
                  className={`hover:bg-surface-muted/50 ${archived ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0 rounded-xl">
                        <AvatarImage src={n.avatar_url ?? undefined} alt={n.name} className="rounded-xl" />
                        <AvatarFallback className="rounded-xl bg-secondary text-primary">
                          <Users className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">
                          {n.name}
                          {archived && (
                            <span className="ml-2 chip !bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] !text-destructive">
                              archived
                            </span>
                          )}
                        </p>
                        {n.tag && <p className="text-xs text-muted-foreground">{n.tag}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{n.votes_count}</td>
                  <td className="px-4 py-3 text-right">
                    <RowActionsMenu
                      label={n.name}
                      actions={
                        [
                          { kind: "button", label: "Edit", icon: Pencil, onSelect: () => setEditing(n) },
                          {
                            kind: "button",
                            label: "Duplicate to…",
                            icon: Copy,
                            onSelect: () => setDuplicateTarget(n),
                          },
                          { kind: "separator" },
                          {
                            kind: "button",
                            label: archived ? "Restore" : "Archive",
                            icon: archived ? ArchiveRestore : Archive,
                            onSelect: () => setArchiveTarget(n),
                          },
                          {
                            kind: "button",
                            label: "Delete",
                            icon: Trash2,
                            destructive: true,
                            onSelect: () => removeNominee(n),
                          },
                        ] satisfies RowAction[]
                      }
                    />
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {nominees.length === 0 ? "No nominees yet. Add one for fans to vote on." : "No nominees match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <NomineeFormModal
          initial={editing ?? { id: "new", name: "", tag: "", bio: "", votes_count: 0 }}
          creating={!editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={saveNominee}
        />
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(o) => !o && !archiveBusy && setArchiveTarget(null)}
        title={
          archiveTarget?.archived_at
            ? `Restore "${archiveTarget?.name}"?`
            : `Archive "${archiveTarget?.name}"?`
        }
        description={
          archiveTarget?.archived_at
            ? "The nominee becomes visible on the public site, leaderboards and search again."
            : "The nominee is hidden from the public site, leaderboards and search. Their vote count and records are kept and you can restore them any time."
        }
        confirmLabel={archiveTarget?.archived_at ? "Restore" : "Archive"}
        destructive={!archiveTarget?.archived_at}
        loading={archiveBusy}
        onConfirm={runArchiveToggle}
      />

      {duplicateTarget && (
        <DuplicateNomineeModal
          nominee={duplicateTarget}
          onClose={() => setDuplicateTarget(null)}
          onDuplicated={(copy) => {
            toast(`${copy.name} duplicated`);
            if (String(copy.subcategory_id) === subcategoryId) {
              setNominees((n) => [...n, copy]);
            }
            setDuplicateTarget(null);
          }}
        />
      )}
    </AdminLayout>
  );
}

/** Copies a nominee's name/tag/bio/photo into a different category + subcategory. */
function DuplicateNomineeModal({
  nominee,
  onClose,
  onDuplicated,
}: {
  nominee: Nominee;
  onClose: () => void;
  onDuplicated: (copy: Nominee) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    categoriesApi
      .list({ per_page: 200 })
      .then((r) => setCategories(r.data))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const targetCategory = categories.find((c) => String(c.id) === categoryId);
  const subcategoryOptions = targetCategory?.subcategories ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!subcategoryId) return;
          setSaving(true);
          setError(null);
          try {
            const copy = await nomineesApi.duplicate(nominee.id, subcategoryId);
            onDuplicated(copy);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Couldn't duplicate this nominee.");
          } finally {
            setSaving(false);
          }
        }}
        className="fb-card w-full max-w-md p-7"
      >
        <div className="flex items-start justify-between">
          <h3 className="font-display text-xl font-bold">Duplicate {nominee.name}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-surface-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates an independent copy (same name, tag, bio and photo, 0 votes) in another
          category or subcategory — for nominees that legitimately compete in more than one
          place instead of typing them in twice.
        </p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <select
              className="fb-input"
              value={categoryId}
              disabled={loading}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId("");
              }}
              required
            >
              <option value="" disabled>
                {loading ? "Loading…" : "Select a category"}
              </option>
              {categories.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Subcategory</label>
            <select
              className="fb-input"
              value={subcategoryId}
              disabled={!categoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              required
            >
              <option value="" disabled>
                {categoryId ? "Select a subcategory" : "Pick a category first"}
              </option>
              {subcategoryOptions.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-7 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving || !subcategoryId} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Duplicate
          </button>
        </div>
      </form>
    </div>
  );
}

function NomineeFormModal({
  initial,
  creating,
  onClose,
  onSave,
}: {
  initial: Partial<Nominee>;
  creating: boolean;
  onClose: () => void;
  onSave: (n: Partial<Nominee>) => void;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [tag, setTag] = useState(initial.tag ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setSaving(true);
          await onSave({
            name: name.trim(),
            tag: tag.trim(),
            bio: bio.trim(),
            avatar_url: avatarUrl.trim() || null,
          });
          setSaving(false);
        }}
        className="fb-card w-full max-w-md p-7"
      >
        <div className="flex items-start justify-between">
          <h3 className="font-display text-xl font-bold">
            {creating ? "New nominee" : `Edit ${initial.name}`}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-surface-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name</label>
            <input
              className="fb-input"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Tag</label>
            <input
              className="fb-input"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Short label shown alongside the name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Bio</label>
            <textarea
              className="fb-input min-h-[80px] resize-y"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
            />
          </div>
          <ImageUploadField
            label="Photo"
            value={avatarUrl}
            onChange={(url) => setAvatarUrl(url ?? "")}
            fallbackIcon={<Users className="h-4 w-4" />}
            helpText="Shown as the nominee's picture on the public site."
          />
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {creating ? "Create nominee" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
