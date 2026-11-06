import { useEffect, useRef, useState, type RefObject } from "react";
import { Hand, Pause, Play } from "lucide-react";
import { mouthPose, type SpeechCue } from "./pipSpeech";
import type { PipPose } from "./pipScene";

function Puppet() {
  return (
    <svg className="pip-puppet" viewBox="0 0 300 360" aria-hidden="true">
      <defs>
        <radialGradient id="pip-fur" cx="35%" cy="25%" r="80%">
          <stop stopColor="#ffc36a" />
          <stop offset=".5" stopColor="#f88f37" />
          <stop offset="1" stopColor="#c64d1d" />
        </radialGradient>
        <radialGradient id="pip-cream" cx="40%" cy="20%">
          <stop stopColor="#fff8df" />
          <stop offset="1" stopColor="#edc695" />
        </radialGradient>
        <radialGradient id="pip-eye">
          <stop stopColor="#a66b37" />
          <stop offset="1" stopColor="#59301e" />
        </radialGradient>
      </defs>
      <g className="puppet-tail">
        <path
          d="M187 292C284 316 292 221 247 181C275 252 201 216 187 292Z"
          fill="url(#pip-fur)"
        />
        <path
          d="M261 242C281 223 262 191 247 181C259 213 232 218 237 231Z"
          fill="url(#pip-cream)"
        />
      </g>
      <g className="puppet-body">
        <ellipse cx="148" cy="258" rx="53" ry="68" fill="url(#pip-fur)" />
        <ellipse cx="148" cy="264" rx="31" ry="49" fill="url(#pip-cream)" />
      </g>
      <ellipse cx="115" cy="318" rx="30" ry="17" fill="url(#pip-fur)" />
      <ellipse cx="179" cy="318" rx="30" ry="17" fill="url(#pip-fur)" />
      <g className="puppet-arm">
        <ellipse
          cx="202"
          cy="261"
          rx="16"
          ry="42"
          transform="rotate(-15 202 261)"
          fill="url(#pip-fur)"
        />
        <ellipse cx="211" cy="288" rx="17" ry="19" fill="url(#pip-fur)" />
      </g>
      <ellipse
        cx="94"
        cy="260"
        rx="16"
        ry="40"
        transform="rotate(12 94 260)"
        fill="url(#pip-fur)"
      />
      <path
        d="M108 203Q145 222 187 202L181 223Q143 237 110 219Z"
        fill="#245a51"
      />
      <path d="M138 219L125 269L148 257L158 225" fill="#2c6d61" />
      <g className="puppet-head">
        <path d="M83 113Q52 17 76 22Q122 44 128 92" fill="url(#pip-fur)" />
        <path d="M92 98Q70 36 80 41L111 92" fill="#df8a86" />
        <path d="M176 94Q198 20 222 20Q241 24 216 117" fill="url(#pip-fur)" />
        <path d="M192 98Q210 42 220 38Q226 46 210 105" fill="#df8a86" />
        <ellipse cx="150" cy="145" rx="88" ry="77" fill="url(#pip-fur)" />
        <path
          d="M63 150Q94 161 132 170L150 190L166 168Q209 162 239 148L229 180Q197 225 150 224Q97 221 69 184Z"
          fill="url(#pip-cream)"
        />
        <g className="puppet-eyes">
          <ellipse cx="116" cy="137" rx="27" ry="31" fill="#fff9eb" />
          <ellipse cx="183" cy="137" rx="27" ry="31" fill="#fff9eb" />
          <ellipse cx="120" cy="141" rx="17" ry="23" fill="url(#pip-eye)" />
          <ellipse cx="179" cy="141" rx="17" ry="23" fill="url(#pip-eye)" />
          <ellipse cx="121" cy="143" rx="9" ry="16" fill="#2c1b20" />
          <ellipse cx="178" cy="143" rx="9" ry="16" fill="#2c1b20" />
          <ellipse cx="114" cy="132" rx="5" ry="7" fill="white" />
          <ellipse cx="172" cy="132" rx="5" ry="7" fill="white" />
        </g>
        <path
          d="M93 100Q111 89 132 99M166 99Q185 89 204 100"
          fill="none"
          stroke="#ba581e"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <ellipse
          className="puppet-mouth"
          cx="150"
          cy="190"
          rx="21"
          ry="3"
          fill="#572c32"
        />
        <ellipse
          className="puppet-jaw"
          cx="150"
          cy="201"
          rx="25"
          ry="12"
          fill="url(#pip-cream)"
        />
        <ellipse cx="133" cy="172" rx="24" ry="16" fill="url(#pip-cream)" />
        <ellipse cx="167" cy="172" rx="24" ry="16" fill="url(#pip-cream)" />
        <path
          d="M137 161Q150 151 163 161Q164 171 150 175Q136 171 137 161"
          fill="#3a2829"
        />
        <ellipse cx="146" cy="160" rx="5" ry="2" fill="#a58e7d" />
        <path
          d="M150 174V181M136 181Q150 194 164 181"
          fill="none"
          stroke="#623b31"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export default function PipAvatar({
  speech,
  speaking,
  listening,
  thinking,
  reducedMotion,
}: {
  speech: RefObject<SpeechCue | null>;
  speaking: boolean;
  listening: boolean;
  thinking: boolean;
  reducedMotion: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"loading" | "3d" | "2d">("loading");
  const [paused, setPaused] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const waveAt = useRef(-1);
  const gaze = useRef({ x: 0, y: 0 });
  const invalidate = useRef<() => void>(() => {});
  const current = useRef({ speaking, listening, thinking, still: false });
  current.current = {
    speaking,
    listening,
    thinking,
    still: paused || reducedMotion || systemReduced,
  };
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    invalidate.current();
  }, [speaking, listening, thinking, paused, reducedMotion, systemReduced]);
  useEffect(() => {
    const element = container.current!;
    const surface = canvas.current!;
    let active = true,
      visible = true,
      frameId = 0,
      lastFrame = 0,
      age = 0;
    let scene:
      | Awaited<ReturnType<(typeof import("./pipScene"))["createPipScene"]>>
      | undefined;
    function schedule() {
      if (active && visible && !document.hidden && !frameId)
        frameId = requestAnimationFrame(draw);
    }
    function draw(now: number) {
      frameId = 0;
      if (!active || !visible || document.hidden) return;
      if (now - lastFrame < 32 && !current.current.still) {
        schedule();
        return;
      }
      const delta = Math.min((now - lastFrame) / 1000 || 0.033, 0.05);
      lastFrame = now;
      if (!current.current.still) age += delta;
      const mouth = current.current.speaking
        ? mouthPose(speech.current, now)
        : { open: 0, round: 0 };
      const pose: PipPose = {
        time: age,
        delta,
        ...mouth,
        ...current.current,
        wave: waveAt.current < 0 ? -1 : (now - waveAt.current) / 1000,
        lookX: gaze.current.x,
        lookY: gaze.current.y,
      };
      let result;
      try {
        result = scene?.render(pose);
      } catch {
        useFallback();
      }
      if (!scene) {
        const motion = pose.still ? 0 : 1;
        const blink = pose.still
          ? 1
          : Math.max(
              0.04,
              1 - Math.exp(-Math.pow(((age % 4.7) - 4.22) / 0.085, 2)),
            );
        element.style.setProperty(
          "--pip-mouth",
          String(pose.still ? 0 : mouth.open),
        );
        element.style.setProperty("--pip-blink", String(blink));
        element.style.setProperty(
          "--pip-head",
          `${(pose.listening ? -6 : gaze.current.x * 5 + Math.sin(age) * 1.2) * motion}deg`,
        );
        element.style.setProperty(
          "--pip-tail",
          `${Math.sin(age * 1.4) * 5 * motion}deg`,
        );
        element.style.setProperty(
          "--pip-breathe",
          `${1 + Math.sin(age * 1.65) * 0.012 * motion}`,
        );
        const wave =
          pose.wave >= 0 && pose.wave < 2.4
            ? Math.sin((pose.wave / 2.4) * Math.PI)
            : 0;
        element.style.setProperty(
          "--pip-wave",
          `${(-105 * wave + Math.sin(age * 13) * wave * 9) * motion}deg`,
        );
        result = {
          open: pose.still ? 0 : mouth.open,
          blink,
          waving: wave > 0.3 && !pose.still,
        };
      }
      // Expose the rendered pose for browser checks and diagnostics; no transcript data.
      element.dataset.mouth = (result?.open ?? 0).toFixed(3);
      element.dataset.blink = (result?.blink ?? 1).toFixed(3);
      element.dataset.gesture = result?.waving ? "wave" : "idle";
      if (!current.current.still) schedule();
    }
    function useFallback() {
      scene?.dispose();
      scene = undefined;
      if (active) setMode("2d");
    }
    function lost(event: Event) {
      event.preventDefault();
      // Disposal can emit another loss event; remove the listener first.
      surface.removeEventListener("webglcontextlost", lost);
      useFallback();
      schedule();
    }
    function resize() {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) scene?.resize(width, height);
      schedule();
    }
    const dimensions = new ResizeObserver(resize);
    dimensions.observe(element);
    const viewport = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible && frameId) {
          cancelAnimationFrame(frameId);
          frameId = 0;
        } else schedule();
      },
      { rootMargin: "80px" },
    );
    viewport.observe(element);
    function visibility() {
      if (document.hidden && frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      } else schedule();
    }
    document.addEventListener("visibilitychange", visibility);
    surface.addEventListener("webglcontextlost", lost);
    invalidate.current = schedule;
    import("./pipScene")
      .then(({ createPipScene }) => {
        if (!active) return;
        try {
          scene = createPipScene(surface);
          resize();
          setMode("3d");
        } catch {
          useFallback();
        }
        schedule();
      })
      .catch(() => {
        if (active) {
          useFallback();
          schedule();
        }
      });
    schedule();
    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      dimensions.disconnect();
      viewport.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      surface.removeEventListener("webglcontextlost", lost);
      invalidate.current = () => {};
      scene?.dispose();
    };
  }, [speech]);
  const still = paused || reducedMotion || systemReduced;
  return (
    <>
      <div
        className="pip-portrait pip-interactive"
        ref={container}
        data-renderer={mode}
        data-animations={still ? "paused" : "playing"}
        role="img"
        aria-label={`Pip, votre renard animé${speaking ? ", en train de parler" : listening ? ", à votre écoute" : ""}`}
        onPointerMove={(event) => {
          if (event.pointerType === "touch" || still) return;
          const box = event.currentTarget.getBoundingClientRect();
          gaze.current = {
            x: Math.max(
              -1,
              Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1),
            ),
            y: Math.max(
              -1,
              Math.min(1, ((event.clientY - box.top) / box.height) * 2 - 1),
            ),
          };
        }}
        onPointerLeave={() => {
          gaze.current = { x: 0, y: 0 };
        }}
      >
        <Puppet />
        <canvas ref={canvas} aria-hidden="true" />
      </div>
      <div className="pip-interactions">
        <button
          type="button"
          className="pip-gesture"
          disabled={still}
          onClick={() => {
            waveAt.current = performance.now();
            invalidate.current();
          }}
        >
          <Hand size={13} /> Faire coucou
        </button>
        <button
          type="button"
          className="pip-gesture pip-motion-toggle"
          aria-label={
            paused
              ? "Reprendre les animations de Pip"
              : "Mettre les animations de Pip en pause"
          }
          aria-pressed={paused}
          disabled={reducedMotion || systemReduced}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
      </div>
    </>
  );
}
