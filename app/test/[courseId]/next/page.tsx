import { redirect, RedirectType } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/test/${courseId}`, RedirectType.push);
}
