'use client'

import { useRef, useMemo, useState, useEffect } from 'react';
import { extend, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Group, Vector2 } from 'three';
import { useRouter } from 'next/navigation';

// === Ripple Shader Material ===
const GhibliShaderMaterial = shaderMaterial(
  {
    u_time: 0,
    u_image_texture: new THREE.Texture(),
    u_resolution: new THREE.Vector2(1, 1),
    u_opacity: 1.0,
    u_mouse: new THREE.Vector2(-1, -1),
    u_ripple_strength: 0.01,
    u_rippleStart: -100.0, // default (no ripple yet)
    u_scrollOffset: 0.0,
    u_imageAspect: 1.0,

  },
  `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
        vUv = vec2(uv.x, 1.0 - uv.y);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform sampler2D u_image_texture;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_opacity;
    uniform float u_ripple_strength;
    uniform vec2 u_mouse;
    uniform float u_rippleStart;
    uniform float u_scrollOffset;
    uniform float u_imageAspect;


    vec3 enhanceColors(vec3 color) {
        color = pow(color, vec3(0.9));
        color = mix(color, color * color * 3.0, 0.1);
        return color;
    }

    float getGlow(vec2 uv) {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(uv, center);
        return 1.0 - smoothstep(0.0, 0.7, dist) * 0.2;
    }

    void main() {
        // Separate UVs: 
        // interactionUV = plane 0..1 (for mouse/ripple logic)
        // textureUV = modified for cover-fit and parallax
        vec2 interactionUV = vUv;
        vec2 textureUV = vUv;

        // ── Cover-fit ──
        float planeAspect = u_resolution.x / u_resolution.y;
        if (u_imageAspect > planeAspect) {
            float scale = planeAspect / u_imageAspect;
            textureUV.x = textureUV.x * scale + (1.0 - scale) * 0.5;
        } else {
            float scale = u_imageAspect / planeAspect;
            textureUV.y = textureUV.y * scale + (1.0 - scale) * 0.5;
        }

        // ── Screen-Space Parallax (Clamped Uniform) ──
        // Driven by u_scrollOffset (computed in useFrame)
        textureUV.x += u_scrollOffset;

        // ── Ripple (Logic uses interactionUV, Effect applied to textureUV) ──
        float rippleHeight = 0.0;
        float elapsed = u_time - u_rippleStart;

        if (elapsed >= 0.0 && elapsed < 3.0) {
          float fade = 1.0 - (elapsed / 3.0);
          float distToMouse = distance(interactionUV, u_mouse); // Correct mouse dist
          float rippleRadius = 0.3;
          float rippleProgress = elapsed * 2.0 - (distToMouse / rippleRadius);
          rippleHeight = sin(rippleProgress * 6.2831) 
                       * smoothstep(rippleRadius, 0.0, distToMouse) 
                       * fade;
        }

        vec2 finalUV = textureUV + rippleHeight * u_ripple_strength;
        
        vec4 textureColor = texture2D(u_image_texture, finalUV);
        vec3 enhanced = enhanceColors(textureColor.rgb);
        
        // Glow uses interactionUV (center of plane)
        float glow = getGlow(interactionUV);
        enhanced *= glow;
        
        
        gl_FragColor = vec4(enhanced, textureColor.a * u_opacity);
    }
  `
);

// === Bubble Shader Material ===
const BubbleShaderMaterial = shaderMaterial(
  {
    u_time: 0,
    u_opacity: 0.6,
  },
  `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float u_time;
    uniform float u_opacity;

    void main() {
        vec2 uv = vUv;
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(uv, center);
        
        float bubble = 1.0 - smoothstep(0.0, 0.5, dist);
        float rim = smoothstep(0.35, 0.5, dist) - smoothstep(0.45, 0.5, dist);
        
        float distortion = sin(u_time * 2.0 + vPosition.x * 10.0) * 0.02;
        bubble *= (1.0 + distortion);
        
        vec3 bubbleColor = vec3(0.8, 0.9, 1.0);
        float alpha = (bubble * 0.1 + rim * 0.8) * u_opacity;
        
        gl_FragColor = vec4(bubbleColor, alpha);
    }
  `
);

// Extend for R3F
extend({
  GhibliShaderMaterial,
  BubbleShaderMaterial
});

// === Image List ===
const images = [
  '/1.webp',
  '/2.webp',
  '/3.webp',
  '/4.webp',
  '/5.webp',
  '/6.webp',
  '/7.webp',
];

export function GhibliScene() {
  const router = useRouter();
  const groupRef = useRef<Group | null>(null);
  const bubblesRef = useRef<Group | null>(null);
  const [loadedTextures, setLoadedTextures] = useState<THREE.Texture[]>([]);
  const [imageDimensions, setImageDimensions] = useState<
    { width: number; height: number; aspectRatio: number }[]
  >([]);

  // Bubble setup
  const bubbles = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      ] as [number, number, number],
      size: 0.1 + Math.random() * 0.4,
      speed: 0.3 + Math.random() * 1,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);


  const { gl } = useThree();

  // Load Textures
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const promises = images.map((url) =>
      new Promise<{ texture: THREE.Texture; dimensions: { width: number; height: number; aspectRatio: number } } | null>((resolve) => {
        loader.load(
          url,
          (loadedTexture) => {
            loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
            loadedTexture.magFilter = THREE.LinearFilter;
            loadedTexture.generateMipmaps = true;
            loadedTexture.anisotropy = 16;
            loadedTexture.format = THREE.RGBAFormat;
            loadedTexture.flipY = false;

            // Extract dimensions but don't update state yet
            const dimensions = loadedTexture.image ? {
              width: loadedTexture.image.width,
              height: loadedTexture.image.height,
              aspectRatio: loadedTexture.image.width / loadedTexture.image.height
            } : { width: 1, height: 1, aspectRatio: 1 };

            resolve({ texture: loadedTexture, dimensions });
          },
          undefined,
          (error) => {
            console.error(`Failed to load texture ${url}:`, error);
            resolve(null);
          }
        );
      })
    );

    Promise.all(promises).then((results) => {
      const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);
      const texs = validResults.map(r => r.texture);
      const dims = validResults.map(r => r.dimensions);

      // Pre-upload textures to GPU to avoid stutter on first frame
      texs.forEach(tex => gl.initTexture(tex));

      // Batch updates to avoid multiple re-renders
      setImageDimensions(dims);
      setLoadedTextures(texs);
    });
  }, [gl]);

  // Initialize Position to -LOOP_LEN (Center Set) once textures load
  useEffect(() => {
    // We calculate LOOP_LEN here to set initial pos
    if (loadedTextures.length > 0 && groupRef.current) {
      const N = loadedTextures.length;
      const STRIDE = 3.5 + 0.5; // PLANE_W + GAP
      const LOOP_LEN = STRIDE * N;
      groupRef.current.position.x = -LOOP_LEN;
    }
  }, [loadedTextures]);

  const PLANE_W = 3.5;
  const PLANE_H = 6;
  const GAP = 0.5;
  const STRIDE = PLANE_W + GAP;            // center-to-center distance
  const N = Math.max(1, loadedTextures.length); // Use loaded count to handle 404s seamlessly
  const LOOP_LEN = STRIDE * N;             // full cycle length

  // Animation Loop
  const SCROLL_SPEED = 1.2;              // group world-units/sec (right → left)

  useFrame((state, delta) => {
    const { clock, viewport } = state;
    const rightEdge = viewport.width / 2;

    // ── group scroll R→L ──
    if (groupRef.current) {
      groupRef.current.position.x -= delta * SCROLL_SPEED;

      // Clean infinite reset:
      // We have 3 sets of images. Size of one set = LOOP_LEN.
      // We start at -LOOP_LEN (Middle Set).
      // When we reach -2 * LOOP_LEN (End of Middle Set), snap back to -LOOP_LEN.
      if (groupRef.current.position.x <= -LOOP_LEN * 2) {
        groupRef.current.position.x += LOOP_LEN;
      }
    }

    // ── per-plane uniforms ──
    if (groupRef.current) {
      const groupX = groupRef.current.position.x;
      groupRef.current.children.forEach((child) => {
        const mat: any = (child as any).material;
        if (mat?.uniforms?.u_time) {
          mat.uniforms.u_time.value = clock.elapsedTime;
        }
        // Parallax Reveal (Uniform to prevent skewing)
        // Calculated on CPU based on world position (approx screen position at z=0)
        if (mat?.uniforms?.u_scrollOffset) {
          const worldX = child.position.x + groupX;
          // Apply same logic: 0.03 factor, clamped to +/- 0.3 (utilizing full headroom)
          let parallax = worldX * 0.03;
          parallax = Math.max(-0.3, Math.min(0.3, parallax));
          mat.uniforms.u_scrollOffset.value = parallax;
        }
      });
    }

    // ── bubbles (unchanged) ──
    if (bubblesRef.current) {
      bubblesRef.current.children.forEach((bubble, index) => {
        const bubbleData = bubbles[index];
        if (bubble && bubbleData) {
          bubble.position.y += delta * bubbleData.speed;
          bubble.position.x +=
            Math.sin(clock.elapsedTime + bubbleData.phase) * delta * 0.2;
          if (bubble.position.y > 15) {
            bubble.position.y = -15;
            bubble.position.x = (Math.random() - 0.5) * 30;
          }
          const bmat: any = (bubble as any).material;
          if (bmat?.uniforms?.u_time)
            bmat.uniforms.u_time.value = clock.elapsedTime;
        }
      });
    }

    // expose clock for pointer events
    state.camera.userData.clock = clock;
  });

  return (
    <>
      <color attach="background" args={["#001a33"]} />

      {/* Floating bubbles */}
      <group ref={bubblesRef}>
        {bubbles.map((bubble) => (
          <group key={bubble.id} position={bubble.position}>
            <mesh scale={[bubble.size, bubble.size, bubble.size]}>
              <circleGeometry args={[1, 16]} />
              {/* @ts-ignore */}
              <bubbleShaderMaterial u_time={0} u_opacity={0.6} transparent blending={THREE.NormalBlending} />
            </mesh>
            <mesh position={[-0.18, 0.18, 0.01]} scale={[bubble.size * 0.18, bubble.size * 0.18, bubble.size * 0.18]}>
              <circleGeometry args={[1, 16]} />
              <meshBasicMaterial color="#e0f7fa" transparent opacity={0.14} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Image planes */}
      <group ref={groupRef}>
        {[...loadedTextures, ...loadedTextures, ...loadedTextures].map((texture, index) => {
          if (!texture) return null;
          const imageIndex = index % N;
          const dims = imageDimensions[imageIndex];
          const imgAspect = dims ? dims.aspectRatio : 16 / 9;


          const getRoute = (idx: number) => {
            switch (idx) {
              case 0: return '/movie/ponyo';
              case 1: return '/movie/kikis-delivery-service';
              case 2: return '/movie/the-wind-rises';
              case 3: return '/movie/boy-and-the-heron';
              case 4: return '/movie/your-name';
              case 5: return '/movie/spirited-away';
              case 6: return '/movie/my-neighbor-totoro';
              default: return '/';
            }
          };

          const targetRoute = getRoute(imageIndex);

          return (
            <mesh
              key={index}
              position={[index * STRIDE, 0, 0]}
              onClick={() => {
                router.push(targetRoute);
              }}
              onPointerOver={(e: any) => {
                const uv = e.uv;
                const mat: any = (e.object as any).material;
                if (mat && e.camera.userData.clock && uv) {
                  mat.uniforms.u_rippleStart.value = e.camera.userData.clock.getElapsedTime();
                  mat.uniforms.u_mouse.value.set(uv.x, 1.0 - uv.y);
                }
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto';
              }}
              onPointerMove={(e: any) => {
                const uv = e.uv;
                const mat: any = (e.object as any).material;
                if (mat && uv) {
                  mat.uniforms.u_mouse.value.set(uv.x, 1.0 - uv.y);
                }
              }}
            >
              <planeGeometry args={[PLANE_W, PLANE_H, 32, 32]} />
              {/* @ts-ignore */}
              <ghibliShaderMaterial
                u_image_texture={texture}
                u_time={0}
                u_ripple_strength={0.02}
                u_resolution={[PLANE_W, PLANE_H]}
                u_imageAspect={imgAspect}
                u_opacity={1.0}
                transparent
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
      </group>
    </>
  );
}

export default GhibliScene;
