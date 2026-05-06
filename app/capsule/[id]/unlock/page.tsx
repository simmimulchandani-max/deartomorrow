import CapsuleOwnerView from '@/components/CapsuleOwnerView';

type CapsuleUnlockPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CapsuleUnlockPage({ params }: CapsuleUnlockPageProps) {
  const { id } = await params;
  return <CapsuleOwnerView shareSlug={id} mode="unlock" />;
}
