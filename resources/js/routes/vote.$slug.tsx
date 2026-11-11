import { createFileRoute } from "@tanstack/react-router";
import { VotePage } from "./vote";

/**
 * Short, readable share links — /vote/{subcategory-slug} instead of
 * /vote?category_id=6&subcategory_id=12. Resolving the slug happens inside VotePage once the
 * category tree has loaded (see its effect keyed on `initialSlug`); this route just supplies
 * the slug from the URL. The legacy query-param form at plain /vote keeps working unchanged,
 * so links already shared with the old format don't break.
 */
export const Route = createFileRoute("/vote/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: "Vote — FansBench" },
      {
        name: "description",
        content: "Pick your nominee and stage your vote — verified by M-Pesa & Dual-OTP.",
      },
    ],
    links: [{ rel: "canonical", href: `/vote/${params.slug}` }],
  }),
  component: function VoteSlugRoute() {
    const { slug } = Route.useParams();
    return <VotePage initialSlug={slug} />;
  },
});
