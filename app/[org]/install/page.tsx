import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getOrg } from '@/lib/orgs';
import { InstallApp } from '@/app/install/page';
import RegisterPanel from './_components/RegisterPanel';
import './register-panel.css';

export default async function OrgInstallPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();
  return (
    <>
      <Suspense fallback={null}>
        <RegisterPanel orgSlug={org.slug} orgName={org.name} domain={org.domain} />
      </Suspense>
      <InstallApp orgSlug={org.slug} />
    </>
  );
}
