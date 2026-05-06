import CapsuleOwnerView from '@/components/CapsuleOwnerView';

type CapsuleStatusPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CapsuleStatusPage({ params }: CapsuleStatusPageProps) {
  const { id } = await params;
  return <CapsuleOwnerView shareSlug={id} mode="status" />;
}
