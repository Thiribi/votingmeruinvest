/**
 * Deep-links into voting, already scoped to a category/subcategory/nominee. When the
 * subcategory's slug is available, this builds the short, readable /vote/{slug} path —
 * matches `vote.$slug.tsx`, which resolves the slug against the already-loaded category
 * tree and pre-selects it, same as the legacy query-string params do. Falls back to the
 * old ?category_id=&subcategory_id= form when no slug is available (e.g. nominees without
 * a subcategory), so nothing that depends on those params stops working.
 */
export function voteShareUrl(params: {
  categoryId?: string | number | null;
  subcategoryId?: string | number | null;
  subcategorySlug?: string | null;
  nomineeId?: string | number | null;
}): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const path = params.subcategorySlug ? `/vote/${params.subcategorySlug}` : "/vote";
  const url = new URL(path, origin || "http://localhost");

  if (!params.subcategorySlug) {
    if (params.categoryId != null) url.searchParams.set("category_id", String(params.categoryId));
    if (params.subcategoryId != null) url.searchParams.set("subcategory_id", String(params.subcategoryId));
  }
  if (params.nomineeId != null) url.searchParams.set("nominee_id", String(params.nomineeId));

  return origin ? url.toString() : `${url.pathname}${url.search}`;
}
