"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type Mode = "idle" | "listening" | "thinking" | "speaking";

function JarvisOrb({ mode, micLevel }: { mode: Mode; micLevel: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<Mode>(mode);
  const micRef = useRef(micLevel);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { micRef.current = micLevel; }, [micLevel]);

  useEffect(() => {
    if (!mountRef.current) return;

    const host = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 5.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const layers: THREE.Line[] = [];
    const segments = 420;

    const makeLayer = (radius: number, opacity: number, wobble: number) => {
      const pts = Array.from({ length: segments }, (_, i) => {
        const a = (i / segments) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      });
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0x16e6df,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending
      });
      const line = new THREE.LineLoop(geo, mat);
      line.userData = { radius, wobble };
      group.add(line);
      layers.push(line);
    };

    makeLayer(1.85, 0.95, 0.18);
    makeLayer(1.72, 0.55, 0.24);
    makeLayer(1.98, 0.35, 0.12);
    makeLayer(1.58, 0.22, 0.08);

    const particleCount = 2200;
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.65 + Math.random() * 0.48;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x18d8d3,
      size: 0.018,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const particles = new THREE.Points(pGeo, pMat);
    group.add(particles);

    const coreGeo = new THREE.SphereGeometry(0.36, 48, 48);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x0d7474, transparent: true, opacity: 0.35 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const haloGeo = new THREE.RingGeometry(0.62, 0.67, 96);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x0c3b3c,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    group.add(halo);

    const clock = new THREE.Clock();
    let raf = 0;

    const resize = () => {
      const s = Math.max(280, Math.min(host.clientWidth, host.clientHeight));
      renderer.setSize(s, s, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const animate = () => {
      const t = clock.getElapsedTime();
      const currentMode = modeRef.current;
      const level = micRef.current;
      const speed = currentMode === "thinking" ? 2.1 : currentMode === "speaking" ? 1.6 : 1;
      const boost = currentMode === "listening" ? level * 0.42 : currentMode === "speaking" ? 0.22 : 0.05;

      layers.forEach((line, idx) => {
        const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
        const { radius, wobble } = line.userData as { radius: number; wobble: number };
        for (let i = 0; i < segments; i++) {
          const a = (i / segments) * Math.PI * 2;
          const n =
            Math.sin(a * (3 + idx) + t * (0.8 + idx * 0.11) * speed) * wobble +
            Math.sin(a * 11 - t * 1.25 * speed) * wobble * 0.35 +
            Math.sin(a * 23 + t * 0.7) * wobble * 0.15;
          const pulse = 1 + boost + Math.sin(t * 2.1 + idx) * 0.015;
          const rr = (radius + n) * pulse;
          attr.setXYZ(i, Math.cos(a) * rr, Math.sin(a) * rr, Math.sin(a * 4 + t) * 0.05);
        }
        attr.needsUpdate = true;
        line.rotation.z += 0.0009 * (idx % 2 ? -1 : 1) * speed;
      });

      particles.rotation.z -= 0.00065 * speed;
      particles.rotation.x = Math.sin(t * 0.25) * 0.05;
      const s = 1 + boost * 0.5 + Math.sin(t * 1.8) * 0.015;
      particles.scale.setScalar(s);

      core.scale.setScalar(1 + boost * 0.8 + Math.sin(t * 2.5) * 0.05);
      (core.material as THREE.MeshBasicMaterial).opacity = currentMode === "thinking" ? 0.5 : 0.35;
      halo.rotation.z = -t * 0.08;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      host.innerHTML = "";
    };
  }, []);

  return <div ref={mountRef} className="orb" aria-label={`JARVIS em modo ${mode}`} />;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("Sistema pronto.");
  const [listening, setListening] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const analyser = analyserRef.current;
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / Math.max(1, data.length);
        setMicLevel(Math.min(1, avg / 95));
      } else {
        setMicLevel(0);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  async function toggleMic() {
    if (listening) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
      analyserRef.current = null;
      setListening(false);
      setMode("idle");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    streamRef.current = stream;
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    setListening(true);
    setMode("listening");
  }

  async function askJarvis(text = input) {
    const prompt = text.trim();
    if (!prompt) return;
    setMode("thinking");
    setReply("Processando…");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha no Gemini");
      setReply(data.text);
      setMode("speaking");

      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(data.text);
        utter.lang = "pt-BR";
        utter.rate = 1.02;
        utter.onend = () => setMode(listening ? "listening" : "idle");
        speechSynthesis.speak(utter);
      } else {
        setTimeout(() => setMode(listening ? "listening" : "idle"), 800);
      }
      setInput("");
    } catch (e) {
      setReply(e instanceof Error ? e.message : "Erro inesperado");
      setMode(listening ? "listening" : "idle");
    }
  }

  return (
    <main>
      <div className="ambient" />
      <section className="stage">
        <JarvisOrb mode={mode} micLevel={micLevel} />
        <div className="status">
          <span className={`dot ${mode}`} />
          <span>{mode === "idle" ? "PRONTO" : mode === "listening" ? "OUVINDO" : mode === "thinking" ? "PROCESSANDO" : "RESPONDENDO"}</span>
        </div>
      </section>

      <section className="panel">
        <p className="reply">{reply}</p>
        <div className="composer">
          <button className={listening ? "mic active" : "mic"} onClick={toggleMic} aria-label="Alternar microfone">
            {listening ? "■" : "●"}
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && askJarvis()}
            placeholder="Fale ou digite um comando…"
          />
          <button className="send" onClick={() => askJarvis()}>ENVIAR</button>
        </div>
      </section>
    </main>
  );
}
