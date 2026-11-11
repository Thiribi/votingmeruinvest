import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
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
  subcategoriesApi,
  nomineesApi,
  ApiError,
  type Category,
  type Subcategory,
  type Nominee,
} from "@/lib/api";

type SubcategoriesSearch = { new?: boolean };

export const Route = createFileRoute("/admin/categories_/$categoryId/subcategories")({
  validateSearch: (search: Record<string, unknown>): SubcategoriesSearch => ({
    new: search.new === "1" || search.new === "true" || search.new === true,
  }),
  component: CategorySubcategories,
});

/** ISO timestamp -> the local "YYYY-MM-DDTHH:mm" value a datetime-local input expects. */
function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** Compact "Recurring · ends 16 Jan 2026" / "One-off · ends …" / "—" summary for the table. */
function seasonSummary(sub: Subcategory): string {
  if (!sub.season_ends_at) return "—";
  const ends = new Date(sub.season_ends_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${sub.is_recurring ? "Recurring" : "One-off"} · ends ${ends}`;
}

function CategorySubcategories() {
  const { categoryId } = Route.useParams();
  const { new: openCreateOnLoad } = Route.useSearch();
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const [creatingSub, setCreatingSub] = useState(Boolean(openCreateOnLoad));
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Subcategory | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  function toast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  function load() {
    setLoading(true);
    Promise.all([
      categoriesApi.get(categoryId, { with_archived: true }),
      nomineesApi.list({ category_id: categoryId, per_page: 500, with_archived: true }),
    ])
      .then(([cat, nom]) => {
        setCategory(cat);
        setSubcategories(cat.subcategories ?? []);
        setNominees(nom.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const filtered = useMemo(
    () => subcategories.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())),
    [subcategories, q],
  );

  async function saveSubcategory(sub: Subcategory, creating: boolean) {
    try {
      if (creating) {
        const created = await subcategoriesApi.create(categoryId, {
          name: sub.name,
          description: sub.description,
          image_url: sub.image_url || undefined,
          season_starts_at: sub.season_starts_at || undefined,
          season_ends_at: sub.season_ends_at || undefined,
          is_recurring: sub.is_recurring ?? false,
        });
        setSubcategories((c) => [...c, created]);
        toast("Subcategory created");
      } else {
        const updated = await subcategoriesApi.update(sub.id, {
          name: sub.name,
          description: sub.description,
          image_url: sub.image_url || null,
          season_starts_at: sub.season_starts_at || null,
          season_ends_at: sub.season_ends_at || null,
          is_recurring: sub.is_recurring ?? false,
        });
        setSubcategories((c) => c.map((s) => (s.id === updated.id ? updated : s)));
        toast("Subcategory updated");
      }
      setCreatingSub(false);
      setEditingSub(null);
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    }
  }

  async function toggleActive(sub: Subcategory) {
    try {
      const updated = await subcategoriesApi.update(sub.id, { is_active: !sub.is_active });
      setSubcategories((c) => c.map((s) => (s.id === updated.id ? updated : s)));
      toast(updated.is_active ? "Subcategory enabled" : "Subcategory disabled");
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    }
  }

  async function runArchiveToggle() {
    if (!archiveTarget) return;
    const sub = archiveTarget;
    setArchiveBusy(true);
    try {
      const updated = sub.archived_at
        ? await subcategoriesApi.unarchive(sub.id)
        : await subcategoriesApi.archive(sub.id);
      setSubcategories((c) => c.map((s) => (s.id === updated.id ? updated : s)));
      toast(sub.archived_at ? "Subcategory restored" : "Subcategory archived");
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    } finally {
      setArchiveBusy(false);
      setArchiveTarget(null);
    }
  }

  async function removeSubcategory(sub: Subcategory) {
    if (!confirm(`Delete subcategory "${sub.name}"? Its items will also be removed.`)) return;
    try {
      await subcategoriesApi.remove(sub.id);
      setSubcategories((c) => c.filter((s) => s.id !== sub.id));
      setNominees((n) => n.filter((x) => x.subcategory_id !== sub.id));
      toast("Subcategory deleted");
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    }
  }

  return (
    <AdminLayout
      title={category ? `Subcategories — ${category.name}` : "Subcategories"}
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
          <Link to="/admin/categories" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <button className="btn-primary" onClick={() => setCreatingSub(true)}>
            <Plus className="h-4 w-4" /> Add subcategory
          </button>
        </div>
      }
    >
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
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Nominees</th>
                <th className="px-4 py-3">Season</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((sub) => {
                const count = nominees.filter((n) => n.subcategory_id === sub.id).length;
                const archived = Boolean(sub.archived_at);
                return (
                  <tr
                    key={String(sub.id)}
                    className={`hover:bg-surface-muted/50 ${archived ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0 rounded-xl">
                          <AvatarImage src={sub.image_url ?? undefined} alt={sub.name} className="rounded-xl" />
                          <AvatarFallback className="rounded-xl bg-secondary text-primary">
                            <Users className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-semibold text-foreground">{sub.name}</p>
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-muted-foreground">
                      <p className="truncate">{sub.description || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground">{count}</td>
                    <td className="px-4 py-3 text-muted-foreground">{seasonSummary(sub)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`chip ${
                          archived || sub.is_active === false
                            ? "!bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] !text-destructive"
                            : "!bg-[color-mix(in_oklab,var(--success)_15%,transparent)] !text-success"
                        }`}
                      >
                        {archived ? "archived" : sub.is_active === false ? "disabled" : "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowActionsMenu
                        label={sub.name}
                        actions={
                          [
                            { kind: "button", label: "Edit", icon: Pencil, onSelect: () => setEditingSub(sub) },
                            {
                              kind: "link",
                              label: "View nominees",
                              icon: Eye,
                              to: "/admin/categories/$categoryId/subcategories/$subcategoryId/nominees",
                              params: { categoryId, subcategoryId: String(sub.id) },
                            },
                            {
                              kind: "link",
                              label: "Add nominee",
                              icon: Plus,
                              to: "/admin/categories/$categoryId/subcategories/$subcategoryId/nominees",
                              params: { categoryId, subcategoryId: String(sub.id) },
                              search: { new: true },
                            },
                            { kind: "separator" },
                            {
                              kind: "button",
                              label: sub.is_active === false ? "Enable" : "Disable",
                              icon: sub.is_active === false ? Power : PowerOff,
                              onSelect: () => toggleActive(sub),
                            },
                            {
                              kind: "button",
                              label: archived ? "Restore" : "Archive",
                              icon: archived ? ArchiveRestore : Archive,
                              onSelect: () => setArchiveTarget(sub),
                            },
                            {
                              kind: "button",
                              label: "Delete",
                              icon: Trash2,
                              destructive: true,
                              onSelect: () => removeSubcategory(sub),
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
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {subcategories.length === 0 ? "No subcategories yet." : "No subcategories match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(creatingSub || editingSub) && (
        <SubcategoryFormModal
          initial={editingSub ?? { id: "new", category_id: categoryId, name: "", description: "" }}
          creating={creatingSub}
          onClose={() => {
            setCreatingSub(false);
            setEditingSub(null);
          }}
          onSave={(sub) => saveSubcategory(sub, creatingSub)}
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
            ? "The subcategory and its nominees become visible on the public site again."
            : "The subcategory is hidden from the public site and search. Its records are kept and you can restore it any time."
        }
        confirmLabel={archiveTarget?.archived_at ? "Restore" : "Archive"}
        destructive={!archiveTarget?.archived_at}
        loading={archiveBusy}
        onConfirm={runArchiveToggle}
      />
    </AdminLayout>
  );
}

function SubcategoryFormModal({
  initial,
  creating,
  onClose,
  onSave,
}: {
  initial: Subcategory;
  creating: boolean;
  onClose: () => void;
  onSave: (s: Subcategory) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [imageUrl, setImageUrl] = useState(initial.image_url ?? "");
  const [seasonStartsAt, setSeasonStartsAt] = useState(toDatetimeLocal(initial.season_starts_at));
  const [seasonEndsAt, setSeasonEndsAt] = useState(toDatetimeLocal(initial.season_ends_at));
  const [isRecurring, setIsRecurring] = useState(initial.is_recurring ?? false);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          if (seasonEndsAt && seasonStartsAt && seasonEndsAt <= seasonStartsAt) return;
          setSaving(true);
          await onSave({
            ...initial,
            name: name.trim(),
            description: description.trim(),
            image_url: imageUrl.trim(),
            season_starts_at: seasonStartsAt || null,
            season_ends_at: seasonEndsAt || null,
            is_recurring: isRecurring,
          });
          setSaving(false);
        }}
        className="fb-card w-full max-w-md p-7"
      >
        <div className="flex items-start justify-between">
          <h3 className="font-display text-xl font-bold">
            {creating ? "New subcategory" : `Edit ${initial.name}`}
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
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              className="fb-input min-h-[80px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
          </div>
          <ImageUploadField
            label="Photo"
            value={imageUrl}
            onChange={(url) => setImageUrl(url ?? "")}
            fallbackIcon={<Users className="h-4 w-4" />}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Voting season (optional)</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Leave blank for unrestricted voting. Set a window to let a fan vote here again once a
              new season starts.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Starts</label>
                <input
                  type="datetime-local"
                  className="fb-input"
                  value={seasonStartsAt}
                  onChange={(e) => setSeasonStartsAt(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Ends</label>
                <input
                  type="datetime-local"
                  className="fb-input"
                  min={seasonStartsAt || undefined}
                  value={seasonEndsAt}
                  onChange={(e) => setSeasonEndsAt(e.target.value)}
                />
              </div>
            </div>
            {seasonEndsAt && seasonStartsAt && seasonEndsAt <= seasonStartsAt && (
              <p className="mt-1.5 text-xs text-destructive">The season end must be after its start.</p>
            )}
            {(seasonStartsAt || seasonEndsAt) && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-muted-foreground">When this season ends, should it renew?</p>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="is_recurring"
                      checked={isRecurring}
                      onChange={() => setIsRecurring(true)}
                    />
                    Recurring — reopen a new season automatically
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="is_recurring"
                      checked={!isRecurring}
                      onChange={() => setIsRecurring(false)}
                    />
                    One-off — stays closed after it ends
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {creating ? "Create" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
