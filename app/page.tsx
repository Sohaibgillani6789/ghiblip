"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { Observer } from "gsap/Observer";
import dynamic from "next/dynamic";
import Image from "next/image";
import '../styles/globals.css';
import LazyGhibliSection from "./shaders/LazyGhibliSection";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(Observer);
}

// Separate style object for better readability
const sectionStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "2rem",
  color: "white",
  position: "relative" as const,
  overflow: "hidden",
};


// Initial state and navigation logic

// Section labels for the navigator
const SECTION_LABELS = ["World", "Magic", "Tribute"];

const HomePage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);
  const currentIndexRef = useRef(-1);
  const sectionScrollsRef = useRef(0);
  const gotoSectionRef = useRef<((index: number, direction: number) => void) | null>(null);
  const [activeSection, setActiveSection] = useState(0);

  const handleNavClick = useCallback((idx: number) => {
    if (isAnimatingRef.current || currentIndexRef.current === idx) return;
    const direction = idx > currentIndexRef.current ? 1 : -1;
    gotoSectionRef.current?.(idx, direction);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Hide container until GSAP setup is done
    containerRef.current.style.visibility = "hidden";

    let ctx: gsap.Context | undefined;
    let mounted = true;

    // Preload images before starting animation
    const imagesToLoad = ['/firstimage.jpg', '/secondimage.jpg'];
    const imagePromises = imagesToLoad.map(src => {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = resolve; // Continue even if error to prevent blocking
      });
    });

    Promise.all(imagePromises).then(() => {
      if (!mounted || !containerRef.current) return;

      ctx = gsap.context(() => {
        const sections = gsap.utils.toArray<HTMLElement>("section");
        const images = gsap.utils.toArray<HTMLDivElement>(".bg");
        const imageClips = gsap.utils.toArray<HTMLDivElement>(".image-clip");

        gsap.set(sections, { autoAlpha: 0 });

        const gotoSection = (index: number, direction: number) => {
          const sectionsLength = sections.length;
          index = (index + sectionsLength) % sectionsLength;
          if (isAnimatingRef.current || index === currentIndexRef.current) return;

          isAnimatingRef.current = true;
          const dFactor = direction === -1 ? -1 : 1;
          const currentSection = sections[currentIndexRef.current];
          const nextSection = sections[index];

          const tl = gsap.timeline({
            defaults: { duration: 1.25, ease: "expo.inOut", force3D: true },
            onComplete: () => {
              isAnimatingRef.current = false;
              setActiveSection(index);
            },
          });

          // If there's a current section, move it to the back but keep it visible during reveal
          if (currentIndexRef.current >= 0) {
            gsap.set(currentSection, { zIndex: 0 });
            tl.to(images[currentIndexRef.current], { yPercent: -10 * dFactor }, 0);
            // Hide it ONLY at the very end to prevent flickering through the clip-path
            tl.set(currentSection, { autoAlpha: 0 });
          }

          // Setup next section
          gsap.set(nextSection, {
            autoAlpha: 1,
            zIndex: 1,
            willChange: "clip-path"
          });

          tl.fromTo(
            nextSection,
            {
              clipPath: "polygon(0% 50%, 100% 50%, 100% 50%, 0% 50%)",
            },
            {
              clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            },
            0
          ).fromTo(images[index], { yPercent: 10 * dFactor }, { yPercent: 0 }, 0);

          currentIndexRef.current = index;
          // Update nav immediately for snappy feel on initial load
          if (index === 0) setActiveSection(0);
        };

        gotoSectionRef.current = gotoSection;

        let initialSection = 0;
        const returnSection = sessionStorage.getItem('returnToSection');
        if (returnSection) {
          initialSection = parseInt(returnSection, 10);
          sessionStorage.removeItem('returnToSection');
        }

        if (initialSection > 0) {
          // Instantly set the state to bypass the initial transition
          const initialTarget = sections[initialSection];
          gsap.set(initialTarget, {
            autoAlpha: 1,
            zIndex: 1,
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
          });
          currentIndexRef.current = initialSection;
        } else {
          gotoSection(0, 1);
        }

        // Reveal container after initial GSAP setup
        if (containerRef.current) containerRef.current.style.visibility = "visible";

        const observer = Observer.create({
          type: "wheel,touch,pointer",
          wheelSpeed: -1,
          onUp: () => {
            if (isAnimatingRef.current) return;
            // ... rest of logic remains same but simplified for this replacement block
            if (currentIndexRef.current === 0) {
              if (sectionScrollsRef.current === 0) {
                isAnimatingRef.current = true;
                gsap.to(imageClips[0], {
                  clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
                  duration: 1.5,
                  ease: "expo.out",
                  force3D: true,
                  onComplete: () => {
                    isAnimatingRef.current = false;
                  },
                });
                sectionScrollsRef.current = 1;
              } else {
                sectionScrollsRef.current = 0;
                gotoSection(currentIndexRef.current + 1, 1);
              }
            } else if (currentIndexRef.current < sections.length - 1) {
              gotoSection(currentIndexRef.current + 1, 1);
            }
          },
          onDown: () => {
            if (isAnimatingRef.current) return;
            if (currentIndexRef.current === 0) {
              if (sectionScrollsRef.current === 1) {
                isAnimatingRef.current = true;
                gsap.to(imageClips[0], {
                  clipPath: "polygon(0% 0%, 100% 0%, 100% 30%, 40% 0%)",
                  duration: 1.5,
                  ease: "power3.out",
                  onComplete: () => {
                    isAnimatingRef.current = false;
                  },
                });
                sectionScrollsRef.current = 0;
              }
            } else if (currentIndexRef.current > 0) {
              gotoSection(currentIndexRef.current - 1, -1);
            }
          },
          tolerance: 10,
          preventDefault: true,
        });
      }, containerRef);
    });

    return () => {
      mounted = false;
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ visibility: "hidden" }}>
      {/* Ghibli Vertical Navigator */}
      <nav className="ghibli-nav" aria-label="Section navigation">
        <div className="ghibli-nav__track">
          {SECTION_LABELS.map((label, i) => (
            <button
              key={i}
              id={`ghibli-nav-btn-${i}`}
              className={`ghibli-nav__item${activeSection === i ? ' ghibli-nav__item--active' : ''}`}
              onClick={() => handleNavClick(i)}
              aria-label={`Navigate to ${label}`}
              aria-current={activeSection === i ? 'true' : undefined}
            >
              {/* Animated dot */}
              <span className="ghibli-nav__dot">
                <span className="ghibli-nav__dot-core" />
                <span className="ghibli-nav__dot-ring" />
                {activeSection === i && <span className="ghibli-nav__dot-pulse" />}
              </span>
              {/* Label */}
              <span className="ghibli-nav__label">{label}</span>
            </button>
          ))}
          {/* Vertical connector line */}
          <div className="ghibli-nav__line" />
        </div>
      </nav>

      {/* Section 1 */}
      <section
        style={{
          ...sectionStyle,
          position: "fixed",
          width: "100%",
          height: "100vh",
          top: 0,
          left: 0,
          backgroundColor: "#000",
        }}
      >
        {/* Background layers */}
        <div
          className="bg"
          style={{
            backgroundImage: "url('/firstimage.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 0,
          }}
        />
        <div
          className="image-clip"
          style={{
            backgroundImage: "url('/secondimage.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            clipPath: "polygon(0% 0%, 100% 0%, 100% 30%, 40% 0%)",
            zIndex: 1,
            willChange: "clip-path, transform",
            transform: "translateZ(0)",
          }}
        />

        {/* Vertical scroll indicator */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            width: "8px",
            height: "80px",
            bottom: 18,
            background: "rgba(255,255,255,0.7)",
            borderRadius: "1px",
            zIndex: 20,
            boxShadow: "0 0 8px 2px rgba(255,255,255,0.2)",
            animation: "scroll-indicator-blink 1.2s infinite alternate"
          }}
        />
        {/* Glassmorphism Card */}
        <div className="glass-card">
          <span className="hero-subtitle">
            Explore the Magic of Ghibli
          </span>

          <h1 className="hero-title">
            Dreams and <br /> Adventure Await
          </h1>

          <p className="hero-description">
            Step into Studio Ghibli's enchanting world, where stunning landscapes,
            heartfelt stories, and unforgettable characters come to life.
          </p>

          <div className="hero-actions">
            <button className="btn-primary">
              Explore more
            </button>
            <button className="btn-secondary">
              Watch now
            </button>
          </div>
        </div>
      </section>

      {/* Section 2 - Lazy loaded Three.js scene with loader */}
      <LazyGhibliSection />

      {/* Section 3 */}
      <section
        className="section3"
        ref={(el) => {
          if (!el || el.dataset.observed) return;
          el.dataset.observed = "true";
          let timeoutId: string | number | NodeJS.Timeout | undefined;
          const observer = new MutationObserver(() => {
            const opacity = parseFloat(el.style.opacity || "0");
            const isVisible =
              opacity > 0 ||
              el.style.visibility === "visible" ||
              el.style.visibility === "inherit";
              
            if (isVisible) {
              if (!el.dataset.timerStarted) {
                el.dataset.timerStarted = "true";
                timeoutId = setTimeout(() => {
                  const video = el.querySelector("video");
                  // Only fade in and play video on tablet/desktop devices 
                  if (video && window.innerWidth >= 768) {
                    video.style.opacity = "1";
                    video.play().catch((err) => console.log("Video play blocked:", err));
                  }
                }, 3500);
              }
            } else {
              // Reset the timer and video immediately when section is hidden
              el.dataset.timerStarted = "";
              if (timeoutId) {
                clearTimeout(timeoutId as any);
                timeoutId = undefined;
              }
              const video = el.querySelector("video");
              if (video) {
                video.pause();
                video.currentTime = 0;
                video.style.opacity = "0";
              }
            }
          });
          observer.observe(el, { attributes: true, attributeFilter: ["style"] });
        }}
      >
        {/* Background Video (Kept in DOM but invisible on mobile) */}
        <video
          src="/ponyo1.mp4"
          preload="auto"
          muted
          loop
          playsInline
          style={{
            opacity: 0,
            transition: "opacity 1s ease-in-out",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: -1,
          }}
        />

        <div className="relative z-20 w-full flex-1 flex flex-col justify-center items-end pr-4 sm:pr-8 md:pr-12 pl-4 pb-20">
          <div 
            className="text-center transition-all duration-700 ease-out hover:transform hover:scale-[1.03] hover:rotate-0" 
            style={{ 
              width: "92%",
              maxWidth: "580px",
              fontFamily: "var(--font-quicksand), sans-serif",
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              padding: "clamp(2rem, 8vw, 4rem)",
              borderRadius: "45px",
              border: "2px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 40px 100px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.05)",
              transform: "rotate(-1.5deg)",
            }}
          >
            <div className="flex flex-col items-center">
              <span 
                className="uppercase tracking-[0.4em] text-[10px] sm:text-xs font-bold mb-4 opacity-80"
                style={{ 
                  color: "#3498db",
                  fontFamily: "var(--font-fredoka), sans-serif" 
                }}
              >
                ✨ A Visual Wonderland ✨
              </span>
              <h2 
                className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-[1.1] text-white"
                style={{ 
                  fontFamily: "var(--font-fredoka), sans-serif",
                  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.3))"
                }}
              >
                A Tribute to <br/> 
                <span style={{ 
                  background: "linear-gradient(135deg, #74b9ff, #3498db)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline-block",
                }}>
                  Ghibli
                </span>
              </h2>
              <div 
                className="w-24 h-[4px] mb-8 opacity-40 rounded-full"
                style={{ background: "linear-gradient(to right, transparent, #3498db, transparent)" }}
              ></div>
              <p 
                className="text-lg sm:text-xl font-medium leading-relaxed max-w-[480px] m-0"
                style={{ 
                  color: "#f0f0f0", 
                  letterSpacing: "0.02em",
                  lineHeight: "1.6" 
                }}
              >
                Jump into a bubbly frontend adventure celebrating the whimsical and heartwarming magic of Studio Ghibli's greatest stories!
              </p>
            </div>
          </div>
        </div>

        {/* GitHub Logo (bottom-right above footer) */}
        <a
          href="https://github.com/Sohaibgillani6789"
          target="_blank"
          rel="noopener noreferrer"
          className="github-logo"
        >
          <Image
            src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
            alt="GitHub"
            width={40}
            height={40}
            priority={false}
          />
        </a>

        {/* Footer */}
        <footer className="footer">
          Made with <span className="heart">❤️</span> by Soahib Gillani
        </footer>
      </section>

      {/* Global CSS */}
      <style jsx global>{`
        @keyframes scroll-indicator-blink {
          0% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        body {
          margin: 0;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        }
        button:focus {
          outline: 2px solid #fff;
        }
        .outer {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .inner {
          text-align: center;
          max-width: 800px;
          padding: 2rem;
          overflow: hidden;
        }

        .section-heading {
          font-size: 3rem;
          margin-bottom: 1rem;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
