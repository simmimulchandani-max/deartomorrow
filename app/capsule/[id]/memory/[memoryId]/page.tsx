import CapsuleMemoryView from '@/components/CapsuleMemoryView';

type CapsuleMemoryPageProps = {
  params: Promise<{
    id: string;
    memoryId: string;
  }>;
};

export default async function CapsuleMemoryPage({ params }: CapsuleMemoryPageProps) {
  const { id, memoryId } = await params;
  return <CapsuleMemoryView shareSlug={id} memoryId={memoryId} />;
}
