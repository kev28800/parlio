import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  X,
  LoaderCircle,
  Hand,
  Hash,
  UsersRound,
  House,
  Coffee,
  Compass,
  type LucideIcon,
} from "lucide-react";

export const unitIcons: Record<string, LucideIcon> = {
  wave: Hand,
  numbers: Hash,
  people: UsersRound,
  home: House,
  coffee: Coffee,
  compass: Compass,
};
export function Spinner({ label = "Un petit instant…" }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={28} />
      <span>{label}</span>
    </div>
  );
}
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <svg viewBox="0 0 40 43" aria-hidden="true">
        <path
          d="M7 4h15c11 0 17 6 17 15S32 33 22 33h-6l-9 9V4Z"
          fill="currentColor"
        />
        <path d="M17 12v13h6c5 0 8-2 8-7s-3-6-8-6h-6Z" fill="#f8f9f5" />
      </svg>
      <span>
        parlio<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
export function Fox({
  scene = false,
  happy = false,
  className = "",
}: {
  scene?: boolean;
  happy?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      className={`fox ${className}`}
      viewBox={scene ? "0 0 400 350" : "65 40 260 270"}
      role="img"
      aria-label={
        happy
          ? "Pip, le renard, vous félicite"
          : "Pip, votre petit compagnon renard"
      }
    >
      <defs>
        <linearGradient id={`fur${uid}`} x1="0" y1="0" x2=".8" y2="1">
          <stop stopColor="#f59c6a" />
          <stop offset="1" stopColor="#e6754d" />
        </linearGradient>
      </defs>
      {scene && (
        <>
          <path
            d="M64 154c-17-63 18-126 90-132 63-6 132 33 146 99 10 44 73 63 65 113-7 53-77 65-135 71-79 7-187-13-190-70-2-34 32-46 24-81Z"
            fill="#e7ead6"
          />
          <path
            d="M78 277c77-27 170-30 253 0"
            fill="none"
            stroke="#c8d2b7"
            strokeWidth="2"
          />
          <g fill="#41654d">
            <path d="M54 276c3-15 7-31 3-54 17 11 14 29 7 43 12-15 20-15 25-15-4 17-17 25-35 26Z" />
            <path d="M337 274c2-19 0-32-6-46-13 16-4 32 0 38-15-8-21-6-26-3 6 10 17 14 32 11Z" />
          </g>
          <g fill="#d5a446">
            <path d="m78 100 4 8 9 2-8 4-2 9-5-8-9-1 8-5Z" />
            <path d="m318 169 3 7 8 2-7 4-2 8-4-7-8-2 7-4Z" />
          </g>
          <g transform="rotate(-8 303 69)">
            <rect
              x="259"
              y="38"
              width="107"
              height="54"
              rx="19"
              fill="#fffdf5"
            />
            <path d="m276 87 1 15 14-14" fill="#fffdf5" />
            <text
              x="312"
              y="72"
              textAnchor="middle"
              fontFamily="Outfit, sans-serif"
              fontSize="23"
              fontWeight="600"
              fill="#354d42"
            >
              Hello!
            </text>
          </g>
          <circle cx="109" cy="52" r="4" fill="#e4b854" />
          <circle cx="351" cy="137" r="3" fill="#e7855c" />
          <path
            d="m48 178 5 5m-1-11-4 16m-5-8 15 2"
            stroke="#a8bba3"
            strokeWidth="2"
          />
          <rect x="130" y="267" width="139" height="21" rx="5" fill="#35574c" />
          <path d="M142 277h115" stroke="#f7f0d9" strokeWidth="8" />
          <rect x="119" y="288" width="163" height="16" rx="5" fill="#e7b14f" />
          <path d="M132 296h136" stroke="#fff5d9" strokeWidth="6" />
        </>
      )}
      <g className="fox-body">
        <path
          d="M242 198c37-29 77-25 72 7-4 35-39 63-74 51-19-7-26-30 2-58Z"
          fill="#d96640"
        />
        <path
          d="M284 189c19-10 35-6 30 16-2 14-9 28-20 37-3-11-10-17-20-19 12-6 15-18 10-34Z"
          fill="#fff0d5"
        />
        <path
          d="M158 174c-23 20-32 61-15 82 15 20 77 22 100 4 23-20 7-71-15-88Z"
          fill={`url(#fur${uid})`}
        />
        <path
          d="M178 180c-12 12-25 37-18 58 6 22 42 27 57 8 10-17 0-49-16-66Z"
          fill="#fff0d5"
        />
        <path
          d="M148 214c-7 9-12 29-9 45 2 10 18 12 25 5 5-6-4-17 0-30m61-20c11 7 18 27 17 43 0 13-18 15-24 7-4-6 2-15-4-27"
          fill={`url(#fur${uid})`}
        />
        <ellipse cx="161" cy="265" rx="22" ry="9" fill="#6b4535" />
        <ellipse cx="224" cy="266" rx="21" ry="9" fill="#6b4535" />
        <path
          d="M137 114c-12-21-18-64-5-66 14-1 42 27 50 43m46 2c10-26 37-54 50-46 8 8 0 55-11 73"
          fill={`url(#fur${uid})`}
        />
        <path d="m139 66 6 43 25-16Zm122 0-24 29 25 14Z" fill="#784936" />
        <path
          d="M122 127c3-40 35-56 74-56 49 0 80 25 81 60 1 34-34 65-77 67-43 0-81-30-78-71Z"
          fill={`url(#fur${uid})`}
        />
        <path
          d="M123 126c17-11 45-2 74 36 30-38 59-47 80-33-3 37-38 65-77 69-39-2-76-31-77-72Z"
          fill="#fff0d5"
        />
        {happy ? (
          <g
            fill="none"
            stroke="#3e3b31"
            strokeWidth="4.5"
            strokeLinecap="round"
          >
            <path d="M155 135q7-9 14 0m58 0q7-9 14 0" />
          </g>
        ) : (
          <g fill="#373b30">
            <ellipse cx="163" cy="134" rx="4.5" ry="6" />
            <ellipse cx="234" cy="134" rx="4.5" ry="6" />
            <circle cx="164" cy="132" r="1.3" fill="white" />
            <circle cx="235" cy="132" r="1.3" fill="white" />
          </g>
        )}
        <ellipse cx="148" cy="149" rx="10" ry="6" fill="#e99b7d" opacity=".7" />
        <ellipse cx="248" cy="149" rx="10" ry="6" fill="#e99b7d" opacity=".7" />
        <path d="M188 159q10-6 21 0l-9 9h-3Z" fill="#3d3d32" />
        <path
          d="M198 168v6m-8-1q8 8 16 0"
          fill="none"
          stroke="#614a35"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M157 187q42 23 82-2l-4 20q-43 16-76-1Z" fill="#416b58" />
        <path d="m215 202 15 25-23-2-6-23" fill="#355a48" />
      </g>
      {scene && (
        <>
          <path d="m96 299 2-11m-5 5 11 1" stroke="#a8bba3" strokeWidth="2" />
          <path d="m312 303 2-11m-5 5 11 1" stroke="#a8bba3" strokeWidth="2" />
          <text
            x="202"
            y="332"
            textAnchor="middle"
            fill="#66765b"
            fontSize="11"
            letterSpacing="2"
            fontFamily="DM Sans, sans-serif"
          >
            A LITTLE, EVERY DAY.
          </text>
        </>
      )}
    </svg>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-top">
        <h2 id={id}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Fermer">
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
