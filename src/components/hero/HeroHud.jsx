import React from 'react';

/**
 * DAOVOS Hero HUD — minimal scroll cue overlay.
 */
export const HeroHud = ({ entered }) => {
  const enteredClass = entered ? 'is-entered' : '';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none' }}>
      {/* Scroll cue */}
      <div
        className="hud-bottom-center"
        style={{
          position: 'absolute',
          bottom: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10
        }}
      >
        <div className={`hud-fade ${enteredClass}`} style={{ transitionDelay: '1.45s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div className="hud-scroll-line" />
          <span className="hud-telemetry" style={{ fontSize: 8, letterSpacing: '0.34em', opacity: 0.5 }}>
            SCROLL
          </span>
        </div>
      </div>
    </div>
  );
};

export default HeroHud;
