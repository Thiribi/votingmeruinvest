import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  Users,
  Building2,
  Tags,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Megaphone,
  LogOut,
  MessageSquareText,
  Map as MapIcon,
  FileSpreadsheet,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";

type NavChild = { to: string; label: string };

type NavItem = {
  /** Omitted for a group header whose only job is to list its children below it. */
  to?: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  /** Requires the full `admin` role. */
  adminOnly?: boolean;
  /** Visible to anyone holding this permission (directly or via an assigned role), matching the API's gating. */
  permission?: string;
  children?: NavChild[];
};

const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, adminOnly: true },
  {
    label: "Users & Roles",
    icon: Users,
    permission: "users.view",
    children: [
      { to: "/admin/users/fans", label: "Fans" },
      { to: "/admin/users/staff", label: "Users" },
    ],
  },
  { to: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck, permission: "roles.manage" },
  { to: "/admin/organizations", label: "Organizations", icon: Building2, permission: "orgs.manage" },
  { to: "/admin/campaigns", label: "Campaign Builder", icon: Megaphone, permission: "campaigns.create" },
  { to: "/admin/categories", label: "Categories", icon: Tags, permission: "categories.manage" },
  {
    label: "Reports",
    icon: FileSpreadsheet,
    permission: "reports.view",
    children: [
      { to: "/admin/reports/votes", label: "Votes Cast" },
      { to: "/admin/reports/revenue", label: "Revenue" },
    ],
  },
  { to: "/admin/fraud", label: "Fraud Review", icon: ShieldAlert, permission: "fraud.review" },
  { to: "/admin/votes-map", label: "Vote Density Map", icon: MapIcon, permission: "fraud.review" },
  { to: "/admin/sms", label: "SMS Gateway", icon: MessageSquareText, permission: "sms.manage" },
];

export function AdminLayout({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Collapsed until clicked — except a group auto-opens while one of its own children is the
  // current page, so landing directly on e.g. Reports > Revenue doesn't hide the active link.
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});
  const isGroupOpen = (item: NavItem) =>
    openOverride[item.label] ?? (item.children?.some((c) => isActive(c.to)) ?? false);
  const toggleGroup = (item: NavItem) =>
    setOpenOverride((cur) => ({ ...cur, [item.label]: !isGroupOpen(item) }));

  const isSuperAdmin = user?.role === "admin";
  const can = (permission?: string) =>
    isSuperAdmin || !permission || !!user?.permissions?.includes(permission);
  const visibleNav = nav.filter(
    (item) => can(item.permission) && (!item.adminOnly || isSuperAdmin),
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile backdrop — tapping it dismisses the drawer, same as the nav links do */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`${
          mobileOpen ? "flex" : "hidden"
        } fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border bg-surface md:sticky md:top-0 md:z-auto md:flex md:h-screen`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 hover:bg-surface-muted md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Administration
          </p>
          <ul className="flex flex-col gap-1">
            {visibleNav.map((item) => (
              <li key={item.to ?? item.label}>
                {item.children ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleGroup(item)}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-surface-muted"
                      aria-expanded={isGroupOpen(item)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          isGroupOpen(item) ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isGroupOpen(item) && (
                      <ul className="ml-4 flex flex-col gap-1 border-l border-border pl-3">
                        {item.children.map((child) => (
                          <li key={child.to}>
                            <Link
                              to={child.to}
                              onClick={() => setMobileOpen(false)}
                              className={`block rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                isActive(child.to)
                                  ? "bg-secondary text-primary"
                                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(item.to!, item.exact)
                        ? "bg-secondary text-primary"
                        : "text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <div className="my-3 border-t border-border" />
          <ul className="flex flex-col gap-1">
            {can("settings.edit") && (
              <li>
                <Link
                  to="/admin/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-border bg-surface px-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="shrink-0 rounded-md p-2 hover:bg-surface-muted md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            {actions}
            {isSuperAdmin && (
              <Link to="/" className="btn-ghost" aria-label="View site">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">View site</span>
              </Link>
            )}
            {user && (
              <span className="hidden text-xs text-muted-foreground lg:inline">
                Signed in as <span className="font-semibold text-foreground">{user.name.split(" ")[0]}</span>
              </span>
            )}
            <button
              onClick={() => {
                logout();
                navigate({ to: "/" });
              }}
              aria-label="Logout"
              className="btn-ghost"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
