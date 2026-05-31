import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ key: string }>;
}

/**
 * The backlog was fused into the Sprints tab — planning the backlog and
 * sprints now happens in one place. Keep this route as a redirect so old
 * links / bookmarks land on the unified view instead of 404ing.
 */
export default async function BacklogRedirectPage({ params }: PageProps) {
  const { key } = await params;
  redirect(`/projects/${key}/sprints`);
}
