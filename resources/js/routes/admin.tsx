import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "FansBench Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <Outlet />,
});
