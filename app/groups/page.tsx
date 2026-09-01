import GroupsPage from '@/components/pages/GroupsPage';

/**
 * A server shell so the route can opt into dynamic rendering. The CSP in
 * proxy.ts is nonce-based, and a nonce is stamped onto scripts at request
 * time — a build-time prerender never receives one, so its own bundles would
 * be refused by the policy. Route segment config is ignored in a "use client"
 * file, which is why the page below is a separate component.
 */
export const dynamic = 'force-dynamic';

export default function Page() {
  return <GroupsPage />;
}
