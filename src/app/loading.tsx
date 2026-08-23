export default function Loading() {
  return (
    <div
      aria-label="Loading page"
      className="mx-auto max-w-[1480px] animate-pulse space-y-5"
    >
      <div className="h-9 w-72 rounded bg-[#e2e2dc]" />
      <div className="h-4 w-[540px] max-w-full rounded bg-[#e7e7e1]" />
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-28 rounded-lg border border-[#dedfd9] bg-white"
            key={index}
          />
        ))}
      </div>
      <div className="h-96 rounded-lg border border-[#dedfd9] bg-white" />
    </div>
  );
}
