import { cn } from "@/lib/utils";
import {
  HorizonHills,
  OliveBranch,
  OliveSprig,
} from "@/components/garden/olive-illustrations";

type GroveBackdropProps = {
  className?: string;
  variant?: "hero" | "compact";
};

export function GroveBackdrop({
  className,
  variant = "hero",
}: GroveBackdropProps) {
  return (
    <div
      className={cn(
        "garden-backdrop pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <div className="garden-sun absolute -right-28 -top-32 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,_rgb(210_168_90_/_0.28)_0%,_rgb(210_168_90_/_0.06)_45%,_transparent_72%)] blur-2xl" />
      <div className="garden-glow-moss absolute -bottom-28 -left-24 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,_rgb(111_141_88_/_0.24)_0%,_transparent_65%)] blur-3xl" />

      <div className="garden-sway-slow absolute -right-10 -top-8 hidden w-[26rem] origin-top-right opacity-65 sm:block lg:w-[30rem]">
        <OliveBranch
          className="h-auto w-full"
          style={{ transform: "scaleX(-1)" }}
        />
      </div>

      {variant === "hero" && (
        <div className="garden-sway absolute -bottom-10 -left-12 hidden w-[22rem] origin-bottom-left opacity-55 md:block lg:w-[26rem]">
          <OliveBranch
            className="h-auto w-full"
            style={{ transform: "rotate(18deg)" }}
          />
        </div>
      )}

      {variant === "hero" && (
        <div className="garden-drift absolute bottom-10 right-8 hidden w-36 opacity-55 lg:block">
          <OliveSprig className="h-auto w-full" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-32 opacity-55">
        <HorizonHills className="h-full w-full" />
      </div>

      <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(circle_at_1px_1px,_rgb(243_239_228_/_0.4)_1px,_transparent_0)] [background-size:18px_18px]" />
    </div>
  );
}
