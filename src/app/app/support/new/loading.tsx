import { FormSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <FormSkeleton fields={4} className="max-w-2xl" />;
}
