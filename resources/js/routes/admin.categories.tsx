import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Tags, Plus, X, Trash2, Loader2, Search, Pencil, Eye, Archive, ArchiveRestore } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ImageUploadField } from "@/components/ImageUploadField";
import { RowActionsMenu, type RowAction } from "@/components/RowActionsMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { categoriesApi, ApiError, type Category } from "@/lib/api";

export const Route = createFileRoute("/admin/categories")({
  component: Categories,
});

type Row = {
  id: string | number;
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  nominees_count: number;
  subcategories_count: number;
  status: "live" | "draft" | "closed";
  archived: boolean;
};

function Categories() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Row | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  function toRow(c: Category): Row {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      image_url: c.image_url ?? "",
      nominees_count: c.nominees_count ?? 0,
      subcategories_count: (c.subcategories ?? []).length,
      status: (c.status as Row["status"]) ?? "live",
      archived: Boolean(c.archived_at),
    };
  }

  useEffect(() => {
    categoriesApi
      .list({ with_archived: true })
      .then((r) => setRows(r.data.map(toRow)))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );

  function toast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2000);
  }

  async function save(row: Row) {
    try {
      if (creating) {
        const created = await categoriesApi.create({
          name: row.name,
          description: row.description,
          image_url: row.image_url || undefined,
          status: row.status,
        });
        setRows((c) => [{ ...row, id: created.id }, ...c]);
      } else {
        await categoriesApi.update(row.id, {
          name: row.name,
          description: row.description,
          image_url: row.image_url || null,
          status: row.status,
        });
        setRows((c) => c.map((x) => (x.id === row.id ? row : x)));
      }
    } catch (e) {
      if (creating) setRows((c) => [row, ...c]);
      else setRows((c) => c.map((x) => (x.id === row.id ? row : x)));
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        toast(e.message);
        return;
      }
    }
    toast(creating ? "Category created" : "Category updated");
    setEditing(null);
    setCreating(false);
  }

  async function remove(row: Row) {
    if (!confirm(`Delete category "${row.name}"?`)) return;
    try {
      await categoriesApi.remove(row.id);
    } catch {}
    setRows((c) => c.filter((x) => x.id !== row.id));
    toast("Category deleted");
  }

  async function runArchiveToggle() {
    if (!archiveTarget) return;
    const row = archiveTarget;
    setArchiveBusy(true);
    try {
      const updated = row.archived
        ? await categoriesApi.unarchive(row.id)
        : await categoriesApi.archive(row.id);
      setRows((c) => c.map((x) => (x.id === row.id ? toRow(updated) : x)));
      toast(row.archived ? "Category restored" : "Category archived");
    } catch (e) {
      if (e instanceof ApiError) toast(e.message);
    } finally {
      setArchiveBusy(false);
      setArchiveTarget(null);
    }
  }

  return (
    <AdminLayout
      title="Categories"
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
          <button
            className="btn-primary"
            onClick={() => {
              setCreating(true);
              setEditing({
                id: "new",
                name: "",
                description: "",
                image_url: "",
                nominees_count: 0,
                subcategories_count: 0,
                status: "draft",
                archived: false,
              });
            }}
          >
            <Plus className="h-4 w-4" /> Add category
          </button>
        </div>
      }
    >
      {flash && (
        <div className="mb-4 rounded-2xl border border-success bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-4 py-2.5 text-sm text-success">
          {flash}
        </div>
      )}
      <div className="fb-card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Subcategories</th>
              <th className="px-4 py-3">Nominees</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {rows.length === 0 ? "No categories yet. Create one to get started." : "No categories match your search."}
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr
                key={String(c.id)}
                className={`hover:bg-surface-muted/50 ${c.archived ? "opacity-60" : ""}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0 rounded-xl">
                      <AvatarImage src={c.image_url} alt={c.name} className="rounded-xl" />
                      <AvatarFallback className="rounded-xl bg-secondary text-primary">
                        <Tags className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-foreground">{c.name}</p>
                  </div>
                </td>
                <td className="max-w-xs px-4 py-3 text-muted-foreground">
                  <p className="truncate">{c.description || "—"}</p>
                </td>
                <td className="px-4 py-3 text-foreground">{c.subcategories_count}</td>
                <td className="px-4 py-3 text-foreground">{c.nominees_count}</td>
                <td className="px-4 py-3">
                  {c.archived ? (
                    <span className="chip !bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] !text-destructive">
                      archived
                    </span>
                  ) : (
                    <span
                      className={`chip ${
                        c.status === "live"
                          ? "!bg-[color-mix(in_oklab,var(--success)_15%,transparent)] !text-success"
                          : c.status === "draft"
                            ? "!bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] !text-accent"
                            : ""
                      }`}
                    >
                      {c.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <RowActionsMenu
                    label={c.name}
                    actions={
                      [
                        {
                          kind: "button",
                          label: "Edit",
                          icon: Pencil,
                          onSelect: () => {
                            setCreating(false);
                            setEditing(c);
                          },
                        },
                        {
                          kind: "link",
                          label: "View subcategories",
                          icon: Eye,
                          to: "/admin/categories/$categoryId/subcategories",
                          params: { categoryId: String(c.id) },
                        },
                        {
                          kind: "link",
                          label: "Add subcategory",
                          icon: Plus,
                          to: "/admin/categories/$categoryId/subcategories",
                          params: { categoryId: String(c.id) },
                          search: { new: true },
                        },
                        { kind: "separator" },
                        {
                          kind: "button",
                          label: c.archived ? "Restore" : "Archive",
                          icon: c.archived ? ArchiveRestore : Archive,
                          onSelect: () => setArchiveTarget(c),
                        },
                        {
                          kind: "button",
                          label: "Delete",
                          icon: Trash2,
                          destructive: true,
                          onSelect: () => remove(c),
                        },
                      ] satisfies RowAction[]
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <CategoryModal
          initial={editing}
          creating={creating}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(o) => !o && !archiveBusy && setArchiveTarget(null)}
        title={
          archiveTarget?.archived
            ? `Restore "${archiveTarget?.name}"?`
            : `Archive "${archiveTarget?.name}"?`
        }
        description={
          archiveTarget?.archived
            ? "The category and its subcategories become visible on the public site again."
            : "The category is hidden from the public site and search. Its records are kept and you can restore it any time."
        }
        confirmLabel={archiveTarget?.archived ? "Restore" : "Archive"}
        destructive={!archiveTarget?.archived}
        loading={archiveBusy}
        onConfirm={runArchiveToggle}
      />
    </AdminLayout>
  );
}

function CategoryModal({
  initial,
  creating,
  onClose,
  onSave,
}: {
  initial: Row;
  creating: boolean;
  onClose: () => void;
  onSave: (r: Row) => Promise<void>;
}) {
  const [form, setForm] = useState<Row>(initial);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          setSaving(true);
          await onSave(form);
          setSaving(false);
        }}
        className="fb-card w-full max-w-lg p-7"
      >
        <div className="flex items-start justify-between">
          <h3 className="font-display text-xl font-bold text-foreground">
            {creating ? "New category" : `Edit ${initial.name}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-surface-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name</label>
            <input
              className="fb-input"
              value={form.name}
              autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={80}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Status</label>
            <select
              className="fb-input"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as Row["status"] })
              }
            >
              <option value="draft">draft</option>
              <option value="live">live</option>
              <option value="closed">closed</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Description
            </label>
            <textarea
              className="fb-input min-h-[96px] resize-y"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={500}
              placeholder="Explain what this category recognises and how nominees qualify."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {(form.description ?? "").length}/500
            </p>
          </div>
          <ImageUploadField
            label="Photo"
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url ?? "" })}
            fallbackIcon={<Tags className="h-5 w-5" />}
            helpText="Shown as the category's picture on the public site."
          />
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
