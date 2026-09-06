import { redirect } from 'next/navigation';

export default async function OrderIdRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/account/orders/${id}`);
}
