import { redirect, RedirectType } from 'next/navigation';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ priorityFirst: string }>;
}) {
  const { courseId } = await params;
  const { priorityFirst } = await searchParams;
  redirect(`/test/${courseId}?priorityFirst=${priorityFirst}`, RedirectType.push);
}
