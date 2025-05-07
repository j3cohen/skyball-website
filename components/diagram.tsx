"use client";

import React from "react";

/**
 * A simple static SVG diagram of a SkyBall court, 44ft x 20ft,
 * with singles lines (2ft from each sideline) and a service line
 * 13.5ft behind the net.  The net is centered at 22ft from each baseline.
 */
export function SkyBallCourtDiagram() {
  // Court dimensions in feet
  const COURT_LENGTH_FT = 44;
  const COURT_WIDTH_FT = 20;
  const NET_POSITION_FT = COURT_LENGTH_FT / 2; // 22ft from either baseline
  // const SINGLES_INSET_FT = 2;                 // 2ft from each sideline
  const SERVICE_LINE_OFFSET_FT = 13.5;        // distance from net

  // For simplicity, define a scale so that 1 foot = 10px.
  // 20ft wide => 200px, 44ft tall => 440px
  const SCALE = 10;

  // Derived pixel dimensions
  const SVG_WIDTH = COURT_WIDTH_FT * SCALE;   // 200px
  const SVG_HEIGHT = COURT_LENGTH_FT * SCALE; // 440px

  // Convert feet to pixels
  const ftToPx = (feet: number) => feet * SCALE;

  // Court boundaries in pixels
  const leftX = 0;
  const rightX = ftToPx(COURT_WIDTH_FT);   // 200
  const topY = 0;
  // const bottomY = ftToPx(COURT_LENGTH_FT); // 440

  // Net line (horizontal) at halfway in the vertical direction:
  const netY = ftToPx(NET_POSITION_FT); // 22ft => 220px from top

  // Singles lines: 2ft from each sideline
  // const leftSinglesX = ftToPx(SINGLES_INSET_FT);                // x=20
  // const rightSinglesX = ftToPx(COURT_WIDTH_FT - SINGLES_INSET_FT); // x=180

  // Service line positions: 13.5ft from net (both top & bottom)
  // net is at y=220, so top service line = 220 - 13.5*10 = 85
  // bottom service line = 220 + 13.5*10 = 355
  const topServiceLineY = netY - ftToPx(SERVICE_LINE_OFFSET_FT);    // 85
  const bottomServiceLineY = netY + ftToPx(SERVICE_LINE_OFFSET_FT); // 355

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      width="100%"
      height="auto"
      style={{ display: "block", maxWidth: "500px", margin: "0 auto" }}
    >
      {/* Court background (green) */}
      <rect
        x={leftX}
        y={topY}
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        fill="#6dbb6d" // tennis-like green
      />

      {/* Outer boundary (white outline) */}
      <rect
        x={leftX}
        y={topY}
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        fill="none"
        stroke="white"
        strokeWidth={2}
      />

      {/* Net (dashed line) */}
      <line
        x1={leftX}
        y1={netY}
        x2={rightX}
        y2={netY}
        stroke="white"
        strokeWidth={4}
        strokeDasharray="10,6" // net effect
      />

      {/* Kitchen lines (aka Non-Volley Zone in pickleball, not strictly needed,
          but included for clarity if you want) */}
      {/* If you don't want "kitchen" lines, remove these: */}
      {/* 
          e.g. 7ft from net => netY - 7ftToPx => netY + 7ftToPx 
          (If you prefer to keep them, adjust as needed for "SkyBall" rules) 
      */}

      {/* Service lines (top & bottom) => 13.5ft from net */}
      {/* top service line (white) */}
      <line
        x1={leftX}
        y1={topServiceLineY}
        x2={rightX}
        y2={topServiceLineY}
        stroke="white"
        strokeWidth={2}
      />
      {/* bottom service line */}
      <line
        x1={leftX}
        y1={bottomServiceLineY}
        x2={rightX}
        y2={bottomServiceLineY}
        stroke="white"
        strokeWidth={2}
      />

      {/* Singles lines => 2ft in from each sideline => from top baseline to bottom baseline */}
      {/* <line
        x1={leftSinglesX}
        y1={topY}
        x2={leftSinglesX}
        y2={bottomY}
        stroke="white"
        strokeWidth={2}
        strokeDasharray="5,3"
      />
      <line
        x1={rightSinglesX}
        y1={topY}
        x2={rightSinglesX}
        y2={bottomY}
        stroke="white"
        strokeWidth={2}
        strokeDasharray="5,3"
      /> */}

      {/* Optionally label the net or lines, if you want text: 
          <text x={5} y={netY - 5} fill="white" fontSize="14">
            Net
          </text>
      */}
    </svg>
  );
}
