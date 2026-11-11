import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Home,
  Trophy,
  Users,
  Building2,
  Bell,
  Menu,
  X,
  MessageSquare,
  Info,
  LogOut,
  ShoppingBasket,
  CheckSquare,
  History,
  ListChecks,
  MessageCircle,
  UserRound,
  LayoutDashboard,
} from "lucide-react";
import { Logo } from "./Logo";
import { UniversalSearch } from "./UniversalSearch";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { nomineesApi, type Nominee } from "@/lib/api";
import { formatVotes } from "@/lib/format";

type NavItem = { to: string; label: string; icon: typeof Home; authOnly?: boolean };

const primaryNav: NavItem[] = [
  { to: "/", label: "Feed", icon: Home },
  { to: "/vote", label: "Vote", icon: CheckSquare },
  { to: "/categories", label: "Categories", icon: Users },
  { to: "/leaderboard", label: "Live Rankings", icon: Trophy },
  { to: "/historical-rankings", label: "Historical Rankings", icon: History },
  { to: "/voting-history", label: "Voting History", icon: ListChecks, authOnly: true },
  { to: "/profile", label: "Profile", icon: UserRound, authOnly: true },
  { to: "/conversations", label: "Posts", icon: MessageCircle },
];

const secondaryNav: NavItem[] = [
  { to: "/about", label: "About", icon: Info },
  { to: "/contact", label: "Contact", icon: MessageSquare },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);
  const { user, loading, logout } = useAuth();
  const { cart } = useCart();
  const cartCount = cart?.items.length ?? 0;
  const [trending, setTrending] = useState<Nominee[]>([]);
  const [trendingWindow, setTrendingWindow] = useState<"24h" | "all_time">("24h");

  useEffect(() => {
    nomineesApi
      .trending({ limit: 4 })
      .then((r) => {
        setTrending(r.data);
        setTrendingWindow(r.window);
      })
      .catch(() => setTrending([]));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <button
            className="rounded-md p-2 lg:hidden hover:bg-surface-muted"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>
          <UniversalSearch className="ml-2 hidden max-w-sm flex-1 md:block" />
          <div className="ml-auto flex items-center gap-1">
            <button
              className="btn-ghost hidden md:inline-flex"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
            {!loading && user?.role === "admin" && (
              <Link to="/admin" className="btn-ghost" aria-label="Admin panel">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Admin panel</span>
              </Link>
            )}
            {!loading && user && (
              <Link to="/cart" className="btn-ghost relative" aria-label="Vote slips">
                <ShoppingBasket className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
            {loading ? null : user ? (
              <>
                <span className="hidden text-sm font-medium text-foreground sm:inline">
                  {user.name}
                </span>
                <button
                  onClick={() => {
                    logout();
                    navigate({ to: "/" });
                  }}
                  className="btn-ghost"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  Sign in
                </Link>
                <Link to="/register" className="btn-accent hidden sm:inline-flex">
                  Join FansBench
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[240px_1fr_320px]">
        {/* Sidebar */}
        <aside
          className={`${
            mobileOpen ? "block" : "hidden"
          } lg:block lg:sticky lg:top-20 lg:self-start`}
        >
          <nav className="fb-card p-2">
            <ul className="flex flex-col gap-1">
              {primaryNav
                .filter((item) => !item.authOnly || user)
                .map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(item.to)
                          ? "bg-secondary text-primary"
                          : "text-foreground hover:bg-surface-muted"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
            <div className="my-2 border-t border-border" />
            <ul className="flex flex-col gap-1">
              {secondaryNav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(item.to)
                        ? "bg-secondary text-primary"
                        : "text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="fb-card mt-4 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Verified voting
            </p>
            <p className="mt-2 text-sm text-foreground">
              Every vote is confirmed via M-Pesa & Dual-OTP. Zero bots, zero
              duplicates.
            </p>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0">{children}</main>

        {/* Right rail */}
        <aside className="hidden lg:block">
          <div className="fb-card p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Trending today
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {trendingWindow === "24h"
                ? "By number of votes cast in the last 24 hours"
                : "By all-time verified votes — quiet in the last 24 hours"}
            </p>
            {trending.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                No verified votes yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {trending.map((n) => (
                  <li key={String(n.id)} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-accent" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {n.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {n.tag ? `${n.tag} · ` : ""}
                        {formatVotes(n.votes_count)} verified votes
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="fb-card mt-4 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Powered by Verification
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              FansBench uses M-Pesa STK-Push and Dual-OTP to guarantee one
              person, one verified vote.
            </p>
          </div>
        </aside>
      </div>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} FansBench · TechDeciphers</span>
          <div className="flex gap-4">
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <a href="mailto:info@techdeciphers.co.ke">info@techdeciphers.co.ke</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
