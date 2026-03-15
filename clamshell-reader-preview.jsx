import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const SAMPLE_TEXT = `The ocean is not silent. It speaks in the language of tides, in the rhythm of waves that have traveled thousands of miles to break upon the shore. Each wave carries with it a history — of storms weathered in the open Atlantic, of moonlit nights where the surface lay still as glass, of the deep trenches where light has never reached and creatures drift through perpetual darkness like thoughts through a sleeping mind.

The earliest sailors understood this. They pressed their ears to the hulls of their wooden ships and listened. The sea told them of approaching weather, of distant land masses deflecting currents, of the great migrations of whales passing far below. They mapped the ocean not by sight but by sound, building an acoustic geography that existed nowhere on paper but lived in the shared memory of generations.

In the abyssal plain, four thousand meters below the surface, the water is nearly freezing. Here, time moves differently. A marine snow of organic particles drifts downward constantly — the remains of surface life settling like ash after a fire that never ends. Creatures here have evolved beyond the need for eyes. They navigate by pressure changes, by the faintest chemical traces dissolved in water that hasn't seen sunlight in a thousand years.

The bioluminescent flash of a deep-sea jellyfish serves no human audience. It is a conversation between organisms that existed for millions of years before anything crawled onto land. Each pulse of blue-green light is a word in a language we are only beginning to decipher — warnings, lures, mating calls, distress signals rippling through the dark water like rumors through a crowd.

Consider the nautilus, that ancient architect. Its shell is a logarithmic spiral, each chamber precisely proportioned to the last according to a ratio that appears everywhere in nature — in the arrangement of sunflower seeds, in the curve of galaxies, in the cochlea of your own inner ear. The nautilus has been building these shells for four hundred million years, long before flowers existed, before birds, before the first dinosaur drew breath.

When you hold a seashell to your ear, you are not hearing the ocean. You are hearing the resonance of ambient sound waves bouncing within the shell's spiral chambers — your own blood, the air conditioning, the hum of traffic outside. But the shell shapes these mundane sounds into something that resembles surf. It is an accidental instrument, a found object that transforms noise into music through geometry alone.

The tide pools are worlds unto themselves. In a space no larger than a bathtub, you can find ecosystems of staggering complexity — hermit crabs negotiating shell exchanges in elaborate chains, anemones waging slow territorial wars measured in centimeters per week, sea stars regenerating lost limbs with a patience that borders on the philosophical. These pools fill and drain twice daily, and every creature within them has adapted to this rhythm of abundance and scarcity.

There is a species of octopus that carries two halves of a coconut shell across the ocean floor, assembling them into a shelter when it needs to rest. This is tool use. This is planning. This is an invertebrate with a distributed nervous system — neurons in each arm operating semi-independently — making decisions about the future. When we speak of intelligence, we often mean something that looks like us. The octopus suggests that consciousness may take forms we barely recognize.

The deepest point in the ocean, the Challenger Deep in the Mariana Trench, descends nearly eleven kilometers below the surface. The pressure there is over a thousand times atmospheric pressure at sea level. And yet, life persists. Amphipods — small, shrimp-like creatures — thrive in these crushing depths, their cell membranes specially adapted with unsaturated fats that remain flexible where others would solidify. They eat whatever drifts down from above, patient recipients of the surface world's castoffs.

Every breath you take contains molecules of water that have cycled through the ocean. The water in your morning coffee may have once been part of a wave that broke on a Jurassic shore, may have passed through the gills of a fish that swam in seas we have no name for, may have fallen as rain on a continent that no longer exists. The ocean is not somewhere else. It is in you, circulating, remembering.`;

function useGrainSVG() {
  return useMemo(() => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.06'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, []);
}

export default function ClamshellReader() {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [totalTextHeight, setTotalTextHeight] = useState(0);
  const measureRef = useRef(null);
  const touchStartY = useRef(0);
  const touchScrollStart = useRef(0);
  const grain = useGrainSVG();

  const CIRCLE_D = 300;
  const CIRCLE_R = CIRCLE_D / 2;
  const BEZEL = 4;
  const RECT_W = Math.floor(CIRCLE_R * 1.55);
  const fullH = Math.sqrt(CIRCLE_R * CIRCLE_R - (RECT_W / 2) * (RECT_W / 2)) * 2;
  const RECT_H = Math.floor(fullH * 0.9);

  useEffect(() => {
    if (measureRef.current) setTotalTextHeight(measureRef.current.scrollHeight);
  }, []);

  const maxScroll = Math.max(0, totalTextHeight - RECT_H * 2);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setScrollOffset((prev) => Math.max(0, Math.min(prev + e.deltaY * 0.5, maxScroll)));
  }, [maxScroll]);

  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    touchScrollStart.current = scrollOffset;
  }, [scrollOffset]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const delta = touchStartY.current - e.touches[0].clientY;
    setScrollOffset(Math.max(0, Math.min(touchScrollStart.current + delta, maxScroll)));
  }, [maxScroll]);

  const textStyle = {
    fontSize: '11px',
    lineHeight: 1.45,
    color: '#5c564f',
    fontFamily: "'Libre Baskerville', Georgia, 'Times New Roman', serif",
    width: RECT_W,
    wordWrap: 'break-word',
    position: 'absolute',
    left: 0,
    top: 0,
    letterSpacing: '0.01em',
  };

  const renderScreen = (yOffset) => (
    <div style={{
      width: CIRCLE_D + BEZEL * 2, height: CIRCLE_D + BEZEL * 2, borderRadius: '50%',
      background: 'linear-gradient(160deg, #b8b0a8 0%, #9e9690 40%, #8a8278 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative',
      boxShadow: '0 0 30px 8px rgba(237,233,222,0.5), 0 0 60px 20px rgba(237,233,222,0.25), 0 0 100px 40px rgba(237,233,222,0.1), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.2)',
    }}>
      <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: 'radial-gradient(circle, rgba(247,243,232,0.3) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{
        width: CIRCLE_D, height: CIRCLE_D, borderRadius: '50%',
        background: 'radial-gradient(circle at 45% 40%, #f7f3e8 0%, #ede9de 50%, #ddd8cb 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.08), inset 0 -1px 3px rgba(255,255,255,0.25)',
      }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 48% 42%, rgba(255,252,240,0.35) 0%, transparent 55%)', pointerEvents: 'none', zIndex: 2 }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundImage: grain, backgroundRepeat: 'repeat', pointerEvents: 'none', zIndex: 3, mixBlendMode: 'multiply' }} />
        <div style={{ width: RECT_W, height: RECT_H, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          <div style={{ ...textStyle, transform: `translateY(-${yOffset}px)` }}>{SAMPLE_TEXT}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: '#c9a0a0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 0, overflow: 'hidden', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      
      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, transparent 20%, rgba(0,0,0,0.12) 100%)', pointerEvents: 'none' }} />

      {/* Hidden measure */}
      <div ref={measureRef} style={{ ...textStyle, position: 'absolute', visibility: 'hidden', top: -99999, left: -99999 }}>{SAMPLE_TEXT}</div>

      {renderScreen(scrollOffset)}

      {/* Hinge */}
      <div style={{
        width: 240, height: 12,
        background: 'linear-gradient(180deg, #4a4240 0%, #6b6260 15%, #9e9290 35%, #b8b0a8 50%, #9e9290 65%, #6b6260 85%, #4a4240 100%)',
        borderRadius: 3, position: 'relative', zIndex: 5, flexShrink: 0, margin: '-2px 0',
        boxShadow: '0 0 6px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -1px 1px rgba(0,0,0,0.2)',
      }}>
        <div style={{ position: 'absolute', top: 5, left: '12%', right: '12%', height: 1, background: 'rgba(255,255,255,0.25)', borderRadius: 1 }} />
      </div>

      {renderScreen(scrollOffset + RECT_H)}
    </div>
  );
}
