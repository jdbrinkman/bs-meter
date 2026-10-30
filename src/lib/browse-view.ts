// Kept apart from listing.ts because the view toggle is a client component and listing.ts talks to the database.
export type ViewKey = "grid" | "list";
export const VIEW_COOKIE = "bs-view";
