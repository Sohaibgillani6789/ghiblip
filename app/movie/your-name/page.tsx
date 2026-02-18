"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useRouter } from "next/navigation";

export default function HowlsPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        gsap.set(el, { y: "100vh" });
        gsap.to(el, { y: "0vh", duration: 1.1, ease: "power4.out", delay: 0.05 });
        return () => { gsap.killTweensOf(el); };
    }, []);

    const handleBack = () => {
        const el = containerRef.current;
        if (!el) return;
        gsap.to(el, {
            y: "100vh",
            duration: 0.75,
            ease: "power3.in",
            onComplete: () => router.push("/"),
        });
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 9999,
                backgroundColor: "#000", color: "#fff", overflowY: "auto", willChange: "transform",
            }}
        >
            <div
                style={{
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                    backgroundImage: "url('/yn.webp')", backgroundSize: "cover", backgroundPosition: "center top",
                    backgroundRepeat: "no-repeat", filter: "brightness(0.45)", zIndex: 0,
                }}
            />
            <div
                style={{
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                    background: "linear-gradient(to top, #000 0%, rgba(0,0,0,0.35) 2%, rgba(0,0,0,0.3) 35%, transparent 100%)",
                    zIndex: 1,
                }}
            />
            <button
                onClick={handleBack}
                style={{
                    position: "absolute", top: "2rem", left: "2rem", zIndex: 10,
                    background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%",
                    width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", backdropFilter: "blur(8px)", color: "#fff", transition: "background 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
            </button>

            <div
                style={{
                    position: "relative", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "flex-end",
                    minHeight: "100vh", padding: "0 4rem 4rem", boxSizing: "border-box", maxWidth: "900px",
                }}
            >
                <h1
                    style={{
                        fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 900, letterSpacing: "-0.03em",
                        margin: "0 0 0.5rem", lineHeight: 1, textShadow: "0 2px 20px rgba(0,0,0,0.8)", fontFamily: "sans-serif",
                    }}
                >
                    Your Name
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: "2rem", marginBottom: "2.5rem", fontSize: "0.95rem", color: "#ccc", fontFamily: "sans-serif" }}>
                    <span style={{ color: "#46d369", fontWeight: 700 }}>8.2/10</span>
                    <span>2004</span>
                    <span style={{ border: "1px solid #888", padding: "0 4px", fontSize: "0.75rem" }}>PG</span>
                    <span>1h 59m</span>
                    <span style={{ border: "1px solid rgba(255,255,255,0.4)", padding: "0 4px", fontSize: "0.75rem", borderRadius: "3px" }}>HD</span>
                </div>
                <p
                    style={{
                        maxWidth: "600px", fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)", lineHeight: 1.6,
                        color: "#e5e5e5", marginBottom: "2rem", fontFamily: "sans-serif",
                    }}
                >
                    When an unconfident young woman is cursed with an old body by a spiteful witch, her only chance of breaking the spell lies with a self-indulgent yet insecure young wizard and his companions in his legged, walking castle.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
                    <button style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.8rem", background: "#fff", color: "#000", fontWeight: 700, fontSize: "1rem", border: "none", borderRadius: "4px", cursor: "pointer", fontFamily: "sans-serif" }}>
                        <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> Play
                    </button>
                    <button style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.8rem", background: "rgba(109,109,110,0.7)", color: "#fff", fontWeight: 700, fontSize: "1rem", border: "none", borderRadius: "4px", cursor: "pointer", backdropFilter: "blur(4px)", fontFamily: "sans-serif" }}>
                        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg> More Info
                    </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", fontSize: "0.85rem", color: "#aaa", fontFamily: "sans-serif" }}>
                    <div><span style={{ color: "#777" }}>Genres: </span>Animation, Adventure, Family</div>
                </div>
            </div>
        </div>
    );
}
