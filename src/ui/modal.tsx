import { ReactNode } from "react";
import { clsx } from "clsx";

type Props = {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
};

export function Modal(props: Props) {
  const { children, className, footer } = props;

  return (
    <div className="flex flex-col items-center h-dvh overflow-y-auto px-4 py-6">
      <div className={clsx("my-auto max-w-[310px] w-full p-6 rounded-[15px] bg-card", className)}>
        {children}
      </div>
      {footer}
    </div>
  );
}
