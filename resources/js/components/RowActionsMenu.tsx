import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type IconType = ComponentType<{ className?: string }>;

export type RowAction =
  | {
      kind: "button";
      label: string;
      icon: IconType;
      onSelect: () => void;
      destructive?: boolean;
      disabled?: boolean;
    }
  | {
      kind: "link";
      label: string;
      icon: IconType;
      to: string;
      params?: Record<string, string>;
      search?: Record<string, unknown>;
    }
  | { kind: "separator" };

/**
 * A single "Actions" button per row instead of a strip of bare icon buttons — clustering
 * Edit/View/Archive/Delete etc. into one popup, and giving every action a visible text
 * label (icon-only buttons with no tooltip were unreadable before).
 */
export function RowActionsMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="btn-outline" aria-label={`Actions for ${label}`}>
          <MoreHorizontal className="h-4 w-4" /> Actions
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action, i): ReactNode => {
          if (action.kind === "separator") {
            return <DropdownMenuSeparator key={i} />;
          }
          if (action.kind === "link") {
            return (
              <DropdownMenuItem key={i} asChild>
                <Link to={action.to} params={action.params} search={action.search}>
                  <action.icon className="h-4 w-4" /> {action.label}
                </Link>
              </DropdownMenuItem>
            );
          }
          return (
            <DropdownMenuItem
              key={i}
              onSelect={action.onSelect}
              disabled={action.disabled}
              className={action.destructive ? "text-destructive focus:text-destructive" : ""}
            >
              <action.icon className="h-4 w-4" /> {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
