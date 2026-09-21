import { PLATFORM_SPECS } from "@/lib/platforms/specs";
import type { PlatformId } from "@/lib/types";

export function PlatformDot({ id, size = 8 }: { id: PlatformId; size?: number }) {
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: size, height: size, background: PLATFORM_SPECS[id].color }}
    />
  );
}

export function PlatformName({ id }: { id: PlatformId }) {
  const spec = PLATFORM_SPECS[id];
  return (
    <span className="inline-flex items-center gap-2">
      <PlatformDot id={id} />
      <span>{spec.name}</span>
      <span className="text-paper-500">{spec.englishName}</span>
    </span>
  );
}
