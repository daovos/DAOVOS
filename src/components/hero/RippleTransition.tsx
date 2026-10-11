// Adapted from Componentry Ripple Transition (MIT, Harsh Jadhav, 2026).

import {
  animate,
  type AnimationPlaybackControls,
  type Easing,
} from "framer-motion";
import * as React from "react";
import "./RippleTransition.css";

export interface RippleTransitionProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children" | "onClick"
> {
  images?: readonly string[];
  duration?: number;
  ease?: Easing;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  autoPlayOrigin?: "center" | "random";
  waveSpeed?: number;
  sigma?: number;
  waveFreq?: number;
  pushAmt?: number;
  caStrength?: number;
  glow?: number;
  noiseWarp?: number;
  pinch?: boolean;
  borderRadius?: number;
  background?: string;
  label?: string;
  active?: boolean;
  interactive?: boolean;
  startOnReady?: boolean;
  onTransitionComplete?: () => void;
}

const sampleImages = [
  "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=85&w=1800",
  "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&q=85&w=1800",
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=85&w=1800",
] as const;

type RippleSettings = {
  waveSpeed: number;
  sigma: number;
  waveFreq: number;
  pushAmt: number;
  caStrength: number;
  glow: number;
  noiseWarp: number;
  pinch: boolean;
};

type Picture = { element: HTMLImageElement; width: number; height: number };

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2(position.x * .5 + .5, .5 - position.y * .5);
  gl_Position = vec4(position, 0., 1.);
}`;

const fragmentSource = `
precision highp float;
varying vec2 uv;
uniform sampler2D fromImage;
uniform sampler2D toImage;
uniform vec2 viewport;
uniform vec2 fromSize;
uniform vec2 toSize;
uniform vec2 origin;
uniform float phase;
uniform float speed;
uniform float thickness;
uniform float frequency;
uniform float displacement;
uniform float chroma;
uniform float highlight;
uniform float roughness;
uniform float pinchAmount;

float random2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float smoothNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  local = local * local * (3. - 2. * local);
  return mix(
    mix(random2(cell), random2(cell + vec2(1., 0.)), local.x),
    mix(random2(cell + vec2(0., 1.)), random2(cell + vec2(1.)), local.x),
    local.y
  );
}

float layeredNoise(vec2 p) {
  return smoothNoise(p) * .57 +
    smoothNoise(p * 2.07 + 4.3) * .29 +
    smoothNoise(p * 4.21 - 2.8) * .14;
}

vec2 cover(vec2 point, vec2 media, vec2 frame) {
  float mediaRatio = media.x / media.y;
  float frameRatio = frame.x / frame.y;
  vec2 crop = frameRatio > mediaRatio
    ? vec2(1., mediaRatio / frameRatio)
    : vec2(frameRatio / mediaRatio, 1.);
  return (point - .5) * crop + .5;
}

vec3 splitSample(sampler2D image, vec2 size, vec2 point, vec2 split) {
  return vec3(
    texture2D(image, cover(point - split, size, viewport)).r,
    texture2D(image, cover(point, size, viewport)).g,
    texture2D(image, cover(point + split, size, viewport)).b
  );
}

void main() {
  float aspect = viewport.x / viewport.y;
  vec2 radial = uv - origin;
  radial.x *= aspect;
  float distanceFromOrigin = length(radial);
  float farthest = length(vec2(aspect, 1.));
  float distance01 = distanceFromOrigin * 2. / farthest;
  float agitation = (layeredNoise(radial * 9. + phase * 1.8) - .5) * roughness;
  float boundary = phase * speed;
  float signedDistance = distance01 + agitation - boundary;
  float wave = exp(-(signedDistance * signedDistance) / max(.0001, 2. * thickness * thickness));
  wave *= .55 + .45 * cos(signedDistance * frequency * 6.28318);
  wave *= smoothstep(0., .08, phase) * (1. - smoothstep(.82, 1., phase));

  vec2 direction = distanceFromOrigin > .0001 ? radial / distanceFromOrigin : vec2(0.);
  direction.x /= aspect;
  float centerPull = exp(-distanceFromOrigin * distanceFromOrigin * 45.) * pinchAmount;
  vec2 offset = direction * (wave * displacement - centerPull * .018);
  vec2 split = direction * wave * chroma;
  float reveal = 1. - smoothstep(-.045, .045, signedDistance);

  vec3 before = splitSample(fromImage, fromSize, uv - offset, split);
  vec3 after = splitSample(toImage, toSize, uv - offset, split);
  vec3 color = mix(before, after, reveal);
  color += wave * highlight * .38;
  color *= 1. - centerPull * .12;
  gl_FragColor = vec4(clamp(color, 0., 1.), 1.);
}`;

function fetchPictures(sources: readonly string[], signal: AbortSignal) {
  return Promise.all(
    sources.map(
      (source) =>
        new Promise<Picture | null>((resolve) => {
          const image = new Image();
          const finish = (picture: Picture | null) => {
            image.onload = null;
            image.onerror = null;
            resolve(picture);
          };
          image.crossOrigin = "anonymous";
          image.onload = () =>
            finish({
              element: image,
              width: image.naturalWidth || 1,
              height: image.naturalHeight || 1,
            });
          image.onerror = () => finish(null);
          signal.addEventListener("abort", () => finish(null), { once: true });
          image.src = source;
        }),
    ),
  ).then((pictures) =>
    pictures.filter((picture): picture is Picture => picture !== null),
  );
}

function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const result = gl.createShader(type);
  if (!result) throw new Error("Unable to allocate a WebGL shader.");
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(result) ?? "Shader compilation failed.";
    gl.deleteShader(result);
    throw new Error(message);
  }
  return result;
}

class RippleRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private vertexShader: WebGLShader;
  private fragmentShader: WebGLShader;
  private geometry: WebGLBuffer;
  private textures: [WebGLTexture, WebGLTexture];
  private textureSlots: [number, number] = [0, 1];
  private phase = 0;
  private origin: [number, number] = [0.5, 0.5];
  private settings: RippleSettings;
  private sizes: [Picture, Picture];

  constructor(
    private canvas: HTMLCanvasElement,
    pictures: Picture[],
    settings: RippleSettings,
  ) {
    const gl = canvas.getContext("webgl", {
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error("WebGL is not supported.");
    this.gl = gl;
    this.settings = settings;
    this.sizes = [pictures[0]!, pictures[1] ?? pictures[0]!];
    this.vertexShader = shader(gl, gl.VERTEX_SHADER, vertexSource);
    this.fragmentShader = shader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error("Unable to allocate a WebGL program.");
    this.program = program;
    gl.attachShader(program, this.vertexShader);
    gl.attachShader(program, this.fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(
        gl.getProgramInfoLog(program) ?? "WebGL program link failed.",
      );
    }
    gl.useProgram(program);

    const geometry = gl.createBuffer();
    if (!geometry) throw new Error("Unable to allocate WebGL geometry.");
    this.geometry = geometry;
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    this.textures = [
      this.makeTexture(0, this.sizes[0].element),
      this.makeTexture(1, this.sizes[1].element),
    ];
    gl.uniform1i(this.location("fromImage"), 0);
    gl.uniform1i(this.location("toImage"), 1);
  }

  private location(name: string) {
    return this.gl.getUniformLocation(this.program, name);
  }

  private makeTexture(unit: number, image: HTMLImageElement) {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error("Unable to allocate a WebGL texture.");
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  resize(width: number, height: number) {
    const density = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.max(1, Math.round(width * density));
    const pixelHeight = Math.max(1, Math.round(height * density));
    if (
      this.canvas.width !== pixelWidth ||
      this.canvas.height !== pixelHeight
    ) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.gl.viewport(0, 0, pixelWidth, pixelHeight);
    }
    this.draw();
  }

  configure(settings: RippleSettings) {
    this.settings = settings;
    this.draw();
  }

  begin(x: number, y: number) {
    this.origin = [x, y];
    this.phase = 0;
    this.draw();
  }

  setPhase(value: number) {
    this.phase = value;
    this.draw();
  }

  advance(picture: Picture) {
    const gl = this.gl;
    const previousToSlot = this.textureSlots[1];
    // Texture slots alternate independently of the image count, including odd loops.
    const nextIndex = 1 - previousToSlot;
    this.textureSlots = [previousToSlot, nextIndex];
    this.sizes = [this.sizes[1], picture];
    gl.activeTexture(gl.TEXTURE0 + nextIndex);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[nextIndex]!);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      picture.element,
    );
    gl.uniform1i(this.location("fromImage"), previousToSlot);
    gl.uniform1i(this.location("toImage"), nextIndex);
    this.phase = 0;
    this.draw();
  }

  draw() {
    const gl = this.gl;
    const s = this.settings;
    gl.useProgram(this.program);
    gl.uniform2f(
      this.location("viewport"),
      this.canvas.width,
      this.canvas.height,
    );
    gl.uniform2f(
      this.location("fromSize"),
      this.sizes[0].width,
      this.sizes[0].height,
    );
    gl.uniform2f(
      this.location("toSize"),
      this.sizes[1].width,
      this.sizes[1].height,
    );
    gl.uniform2f(this.location("origin"), this.origin[0], this.origin[1]);
    gl.uniform1f(this.location("phase"), this.phase);
    gl.uniform1f(this.location("speed"), s.waveSpeed);
    gl.uniform1f(this.location("thickness"), s.sigma);
    gl.uniform1f(this.location("frequency"), s.waveFreq);
    gl.uniform1f(this.location("displacement"), s.pushAmt);
    gl.uniform1f(this.location("chroma"), s.caStrength);
    gl.uniform1f(this.location("highlight"), s.glow);
    gl.uniform1f(this.location("roughness"), s.noiseWarp * 0.09);
    gl.uniform1f(this.location("pinchAmount"), s.pinch ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    const gl = this.gl;
    this.textures.forEach((texture) => gl.deleteTexture(texture));
    gl.deleteBuffer(this.geometry);
    gl.deleteProgram(this.program);
    gl.deleteShader(this.vertexShader);
    gl.deleteShader(this.fragmentShader);
  }
}

export function RippleTransition({
  images = sampleImages,
  duration = 1.4,
  ease = "easeInOut",
  autoPlay = false,
  autoPlayInterval = 3200,
  autoPlayOrigin = "center",
  waveSpeed = 1.6,
  sigma = 0.15,
  waveFreq = 5,
  pushAmt = 0.145,
  caStrength = 0.02,
  glow = 0.73,
  noiseWarp = 1,
  pinch = false,
  borderRadius = 24,
  background = "#111416",
  label = "Ripple image transition",
  active = true,
  interactive = true,
  startOnReady = false,
  onTransitionComplete,
  className,
  style,
  ...props
}: RippleTransitionProps) {
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [currentImage, setCurrentImage] = React.useState(images[0]);
  const [reducedMotion, setReducedMotion] = React.useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const visibleRef = React.useRef(true);
  const initialPlayRef = React.useRef<() => void>(() => undefined);
  const completeRef = React.useRef(onTransitionComplete);
  completeRef.current = onTransitionComplete;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const engineRef = React.useRef<RippleRenderer | null>(null);
  const playRef = React.useRef<(x?: number, y?: number) => void>(
    () => undefined,
  );
  const settings = React.useMemo<RippleSettings>(
    () => ({
      waveSpeed,
      sigma,
      waveFreq,
      pushAmt,
      caStrength,
      glow,
      noiseWarp,
      pinch,
    }),
    [caStrength, glow, noiseWarp, pinch, pushAmt, sigma, waveFreq, waveSpeed],
  );
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;

  React.useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry?.isIntersecting ?? false;
      if (visibleRef.current) initialPlayRef.current();
    });
    const onVisibilityChange = () => {
      if (!document.hidden) initialPlayRef.current();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      preference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      observer.disconnect();
    };
  }, []);

  React.useEffect(() => {
    engineRef.current?.configure(settings);
  }, [settings]);

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    setReady(false);
    setFailed(false);
    setCurrentImage(images[0]);
    if (!active || !root || !canvas) return;
    if (reducedMotion) {
      completeRef.current?.();
      return;
    }
    const abortController = new AbortController();
    let animation: AnimationPlaybackControls | null = null;
    let engine: RippleRenderer | null = null;
    let busy = false;
    let current = 0;
    let observer: ResizeObserver | null = null;
    let initialPlayPending = startOnReady;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setReady(false);
      setFailed(true);
      abortController.abort();
      completeRef.current?.();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    abortController.signal.addEventListener("abort", () => {
      observer?.disconnect();
      animation?.stop();
      engine?.destroy();
      engine = null;
      engineRef.current = null;
      playRef.current = () => undefined;
      initialPlayRef.current = () => undefined;
    }, { once: true });

    fetchPictures(images, abortController.signal).then((pictures) => {
      if (abortController.signal.aborted) return;
      if (pictures.length === 0) throw new Error("No ripple images could be loaded.");
      engine = new RippleRenderer(canvas, pictures, settingsRef.current);
      engineRef.current = engine;
      observer = new ResizeObserver(([entry]) => {
        const box = entry?.contentRect;
        if (box) engine?.resize(box.width, box.height);
      });
      observer.observe(root);
      engine.resize(root.clientWidth, root.clientHeight);
      setReady(true);

      playRef.current = (x = 0.5, y = 0.5) => {
        if (busy || pictures.length < 2 || !engine || !visibleRef.current || document.hidden) return;
        initialPlayPending = false;
        busy = true;
        engine.begin(x, y);
        animation?.stop();
        animation = animate(0, 1, {
          duration,
          ease,
          onUpdate: (value) => engine?.setPhase(value),
          onComplete: () => {
            current = (current + 1) % pictures.length;
            setCurrentImage(pictures[current]!.element.src);
            const following = pictures[(current + 1) % pictures.length]!;
            engine?.advance(following);
            busy = false;
            completeRef.current?.();
          },
        });
      };

      initialPlayRef.current = () => {
        if (initialPlayPending) playRef.current();
      };
      if (pictures.length < 2 && startOnReady) completeRef.current?.();
      else initialPlayRef.current();
    }).catch(() => {
      if (abortController.signal.aborted) return;
      setReady(false);
      setFailed(true);
      abortController.abort();
      completeRef.current?.();
    });

    return () => {
      playRef.current = () => undefined;
      initialPlayRef.current = () => undefined;
      engineRef.current = null;
      abortController.abort();
      canvas.removeEventListener("webglcontextlost", onContextLost);
    };
  }, [active, duration, ease, images, reducedMotion, startOnReady]);

  React.useEffect(() => {
    if (!autoPlay || !active || reducedMotion || failed || !ready) return;
    const timer = window.setInterval(() => {
      const x = autoPlayOrigin === "random" ? 0.18 + Math.random() * 0.64 : 0.5;
      const y = autoPlayOrigin === "random" ? 0.18 + Math.random() * 0.64 : 0.5;
      playRef.current(x, y);
    }, autoPlayInterval);
    return () => window.clearInterval(timer);
  }, [active, autoPlay, autoPlayInterval, autoPlayOrigin, failed, ready, reducedMotion]);

  return (
    <div
      ref={rootRef}
      className={["ripple-transition", interactive && "ripple-transition--interactive", className].filter(Boolean).join(" ")}
      style={{
        borderRadius,
        background,
        backgroundImage: currentImage ? `url("${currentImage}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        touchAction: "manipulation",
        ...style,
      }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? label : undefined}
      aria-hidden={interactive ? undefined : true}
      data-state={!active ? "idle" : reducedMotion ? "static" : failed ? "fallback" : ready ? "ready" : "loading"}
      onPointerUp={(event) => {
        if (!interactive || reducedMotion) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        playRef.current(
          (event.clientX - bounds.left) / bounds.width,
          (event.clientY - bounds.top) / bounds.height,
        );
      }}
      onKeyDown={(event) => {
        if (!interactive || reducedMotion) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          playRef.current();
        }
      }}
      {...props}
    >
      <canvas ref={canvasRef} aria-hidden="true" style={{ opacity: active && ready && !failed && !reducedMotion ? 1 : 0 }} />
    </div>
  );
}
