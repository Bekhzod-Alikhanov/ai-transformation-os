import { SectionHeader, Surface } from "@/components/ui/surface";

export function LiveEmptyState({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        description={description}
        eyebrow={eyebrow}
        title={title}
      />
      <Surface className="p-6">
        <p className="text-sm leading-6 text-[#696c63]">
          This live workspace contains no organisation-scoped records for this
          view. Synthetic Aster examples remain isolated to the demo workspace.
        </p>
      </Surface>
    </div>
  );
}
