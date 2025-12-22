"use client"

export type ServingFormat = "standard" | "servicebox"

export interface PickleballCourtProps {
  showKitchen?: boolean
  showServiceBox?: boolean
  showPlayers?: boolean
  showServing?: boolean
  servingFormat?: ServingFormat
}

/**
 * Reusable SkyBall / Pickleball court diagram.
 * Default dimensions are proportional to 44' x 20'.
 */
export function PickleballCourt({
  showKitchen = false,
  showServiceBox = false,
  showPlayers = false,
  showServing = false,
  servingFormat = "standard",
}: PickleballCourtProps) {
  const courtWidth = 200
  const courtHeight = 100

  // Court measurements (proportional to 44ft x 20ft)
  const netPosition = courtWidth * 0.5 // 22ft from left (center)
  const kitchenLeft = courtWidth * (15 / 44) // 15ft from left
  const kitchenRight = courtWidth * (29 / 44) // 29ft from left
  const serviceLeft = courtWidth * (10 / 44) // 10ft from left
  const serviceRight = courtWidth * (34 / 44) // 34ft from left

  return (
    <div className="flex justify-center">
      <svg width={courtWidth + 40} height={courtHeight + 20} className="border rounded" role="img" aria-label="Court diagram">
        {/* Court surface */}
        <rect x={20} y={10} width={courtWidth} height={courtHeight} fill="#2d5a27" stroke="#ffffff" strokeWidth="2" />

        {/* Net */}
        <line
          x1={netPosition + 20}
          y1={10}
          x2={netPosition + 20}
          y2={courtHeight + 10}
          stroke="#000000"
          strokeWidth="3"
        />

        {/* Center line - conditional based on format */}
        {showKitchen && servingFormat === "standard" ? (
          // Standard play: center line only outside kitchen areas
          <>
            <line
              x1={20}
              y1={courtHeight / 2 + 10}
              x2={kitchenLeft + 20}
              y2={courtHeight / 2 + 10}
              stroke="#ffffff"
              strokeWidth="1"
            />
            <line
              x1={kitchenRight + 20}
              y1={courtHeight / 2 + 10}
              x2={courtWidth + 20}
              y2={courtHeight / 2 + 10}
              stroke="#ffffff"
              strokeWidth="1"
            />
          </>
        ) : showServiceBox && servingFormat === "servicebox" ? (
          // Service box play: center line only between net and service box lines
          <>
            <line
              x1={serviceLeft + 20}
              y1={courtHeight / 2 + 10}
              x2={netPosition + 20}
              y2={courtHeight / 2 + 10} 
              stroke="#ffffff"
              strokeWidth="1"
            />
            <line
              x1={netPosition + 20}
              y1={courtHeight / 2 + 10}
              x2={serviceRight + 20}
              y2={courtHeight / 2 + 10}
              stroke="#ffffff"
              strokeWidth="1"
            />
          </>
        ) : (
          // Default: full center line
          <line
            x1={20}
            y1={courtHeight / 2 + 10}
            x2={courtWidth + 20}
            y2={courtHeight / 2 + 10}
            stroke="#ffffff"
            strokeWidth="1"
          />
        )}

        {/* Kitchen lines (Standard Play) - white */}
        {showKitchen && (
          <>
            <line
              x1={kitchenLeft + 20}
              y1={10}
              x2={kitchenLeft + 20}
              y2={courtHeight + 10}
              stroke="#ffffff"
              strokeWidth="1"
            />
            <line
              x1={kitchenRight + 20}
              y1={10}
              x2={kitchenRight + 20}
              y2={courtHeight + 10}
              stroke="#ffffff"
              strokeWidth="1"
            />
          </>
        )}

        {/* Service box lines (Service Box Play) - red */}
        {showServiceBox && (
          <>
            <line
              x1={serviceLeft + 20}
              y1={10}
              x2={serviceLeft + 20}
              y2={courtHeight + 10}
              stroke="#ef4444"
              strokeWidth="2"
            />
            <line
              x1={serviceRight + 20}
              y1={10}
              x2={serviceRight + 20}
              y2={courtHeight + 10}
              stroke="#ef4444"
              strokeWidth="2"
            />
          </>
        )}

        {/* Players */}
        {showPlayers && (
          <>
            <circle cx={courtWidth / 4 + 20} cy={courtHeight / 2 + 10} r="6" fill="#3b82f6" />
            <text x={courtWidth / 4 + 20} y={courtHeight / 2 + 25} textAnchor="middle" fontSize="12" fill="#374151">
              P1
            </text>
            <circle cx={(3 * courtWidth) / 4 + 20} cy={courtHeight / 2 + 10} r="6" fill="#ef4444" />
            <text
              x={(3 * courtWidth) / 4 + 20}
              y={courtHeight / 2 + 25}
              textAnchor="middle"
              fontSize="12"
              fill="#374151"
            >
              P2
            </text>
          </>
        )}

        {/* Serving positions and target areas */}
        {showServing && (
          <>
            {servingFormat === "standard" ? (
              <>
                {/* Server behind left baseline */}
                <circle cx={10} cy={courtHeight * 0.75 + 10} r="6" fill="#3b82f6" />
                <text x={10} y={courtHeight * 0.75 + 25} textAnchor="middle" fontSize="10" fill="#374151">
                  
                </text>

                {/* Target area - entire crosscourt half including kitchen */}
                <rect
                  x={kitchenRight + 20}
                  y={10}
                  width={courtWidth / 2 + (netPosition - kitchenRight)}
                  height={courtHeight / 2}
                  fill="rgba(249, 115, 22, 0.2)"
                  stroke="#f97316"
                  strokeWidth="2"
                  strokeDasharray="3,3"
                />

                {/* Serve arrow */}
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
                  </marker>
                </defs>
                <line
                  x1={16}
                  y1={courtHeight * 0.75 + 10}
                  x2={kitchenRight + 40}
                  y2={courtHeight * 0.25 + 10}
                  stroke="#374151"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  markerEnd="url(#arrowhead)"
                />
              </>
            ) : (
              <>
                {/* Server behind right baseline */}
                <circle cx={courtWidth + 30} cy={courtHeight * 0.25 + 10} r="6" fill="#3b82f6" />
                <text x={courtWidth + 30} y={courtHeight * 0.25 + 25} textAnchor="middle" fontSize="10" fill="#374151">
                  
                </text>

                {/* Target area - diagonal service box only (between service line and net) */}
                <rect
                  x={serviceLeft + 20}
                  y={courtHeight / 2 + 10}
                  width={netPosition - serviceLeft}
                  height={courtHeight / 2}
                  fill="rgba(249, 115, 22, 0.2)"
                  stroke="#f97316"
                  strokeWidth="2"
                  strokeDasharray="3,3"
                />

                {/* Serve arrow */}
                <defs>
                  <marker id="arrowhead2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
                  </marker>
                </defs>
                <line
                  x1={courtWidth + 24}
                  y1={courtHeight * 0.25 + 10}
                  x2={serviceLeft + 40}
                  y2={courtHeight * 0.75 + 10}
                  stroke="#374151"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  markerEnd="url(#arrowhead2)"
                />
              </>
            )}
          </>
        )}

        {/* Court dimensions */}
        <text x={courtWidth / 2 + 20} y={courtHeight + 35} textAnchor="middle" fontSize="10" fill="#6b7280">
          44&apos; × 20&apos;
        </text>
      </svg>
    </div>
  )
}
