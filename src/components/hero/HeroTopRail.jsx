import React from 'react';
import { DaovosLockup } from '../brand/DaovosLockup';

/**
 * Quiet, non-interactive hero masthead: brand and service statement only.
 */
export const HeroTopRail = ({ entered }) => (
  <header className={`hero-top-rail${entered ? ' is-entered' : ''}`} aria-label="DAOVOS studio masthead">
    <div className="hero-top-rail__brand">
      <DaovosLockup
        symbolSize={27}
        wordmarkWidth={108}
        gap={12}
        color="currentColor"
      />
    </div>

    <p className="hero-top-rail__meta" aria-label="Design, build, scale">
      <span className="hero-top-rail__word"><span data-label="DESIGN">DESIGN</span></span>
      <i aria-hidden="true">/</i>
      <span className="hero-top-rail__word"><span data-label="BUILD">BUILD</span></span>
      <i aria-hidden="true">/</i>
      <span className="hero-top-rail__word"><span data-label="SCALE">SCALE</span></span>
    </p>
  </header>
);

export default HeroTopRail;
