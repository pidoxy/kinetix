import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

// This is a simplified version of the logo from the design
const CrossIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 5v14"/>
    <path d="M5 12h14"/>
  </svg>
);


export function KinetixLogo({ className, ...props }: SVGProps<SVGSVGElement> & {className?: string}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
        <CrossIcon className="h-4 w-4" {...props} />
        <span className="font-semibold tracking-widest text-sm text-slate-200">KINETIX AI</span>
    </div>
  );
}
