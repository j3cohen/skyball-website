"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PickleballCourtProps {
  showKitchen?: boolean
  showServiceBox?: boolean
  showPlayers?: boolean
  showServing?: boolean
  servingFormat?: "standard" | "servicebox"
}

function PickleballCourt({
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
      <svg width={courtWidth + 40} height={courtHeight + 20} className="border rounded">
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

        {/* Kitchen lines (Standard Play) - same color as center line */}
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

        {/* Service box lines (Service Box Play) */}
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
                  Serve
                </text>

                {/* Target area - entire crosscourt half including kitchen */}
                <rect
                  x={netPosition + 20}
                  y={10}
                  width={courtWidth / 2}
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
                  x2={netPosition + 40}
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
                  Serve
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

export default function HowToPlay() {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: "Equipment & Setup",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">What You Need</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <Image
                  src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/tennisRacketImage.png"
                  alt="SkyBall Racquet"
                  width={96}
                  height={96}
                  className="w-24 h-24 mx-auto mb-2 object-contain"
                />
                <p className="font-medium">21&quot; Stringed Racquets</p>
                <p className="text-sm text-gray-600">One per player</p>
              </div>
              <div className="text-center">
                <Image
                  src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/newballicon.png"
                  alt="SkyBall Ball"
                  width={96}
                  height={96}
                  className="w-24 h-24 mx-auto mb-2 object-contain"
                />
                <p className="font-medium">High-Density Foam Balls</p>
                <p className="text-sm text-gray-600">2-3 balls recommended</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h4 className="font-semibold mb-3">Court Setup</h4>
            <PickleballCourt showKitchen={true} showPlayers={true} />
            <p className="text-sm text-gray-600 mt-2">
              Find any pickleball court. Players take opposite sides of the net.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Serving Rules",
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Standard Play
                  <Badge variant="secondary">Any Pickleball Court</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <PickleballCourt showKitchen={true} showServing={true} servingFormat="standard" />
                <ul className="text-sm space-y-1">
                  <li>• Serve underhand only</li>
                  <li>• Serve crosscourt anywhere in bounds</li>
                  <li>• Entire crosscourt half is valid (including kitchen)</li>
                  <li>• Lets are replayed</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Service Box Play
                  <Link href="/conversion">
                    <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200">
                      Court Conversion
                    </Badge>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <PickleballCourt showServiceBox={true} showServing={true} servingFormat="servicebox" />
                <ul className="text-sm space-y-1">
                  <li>• Any serve style allowed</li>
                  <li>
                    • Must land in diagonal service box (between service line (12&apos;) and net)
                  </li>
                  <li>• Lets are replayed</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    {
      title: "Rally Play",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">After the Serve</h3>
            <PickleballCourt showKitchen={true} showPlayers={true} />
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Play Like Tennis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li>• Hit the ball anywhere on the court</li>
                    <li>• No kitchen restrictions during rallies</li>
                    <li>• Ball can bounce once or be hit in the air</li>
                    <li>• Rally continues until someone misses</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Scoring",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Simple Scoring System</h3>
            <PickleballCourt showKitchen={true} showPlayers={true} />

            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Game Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li>• First to 11 points wins</li>
                    <li>• Must win by 2 points</li>
                    <li>• Anyone can score on any point</li>
                    <li>• No need to be serving to score</li>
                    <li>• Best of 3, 5, or 7 game sets can be played</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Serving Order</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li>• First player serves 1 point</li>
                    <li>• Then alternate 2 points each</li>
                    <li>• Continue pattern throughout game</li>
                    <li>• Switch sides after each game</li>
                    <li>• In competitive play: switch every 6 points (i.e., 6, 12, 18...)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 p-4 bg-sky-50 rounded-lg">
              <p className="text-center font-medium text-sky-800">
                That&apos;s it! You&apos;re ready to play SkyBall. Simple rules, exciting gameplay.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 max-w-4xl py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 md:mb-4">How to Play SkyBall™</h1>
          <p className="text-lg md:text-xl text-gray-600">Get playing in 60 seconds with this quick guide</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep ? "bg-sky-600" : index < currentStep ? "bg-sky-300" : "bg-gray-300"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Step {currentStep + 1}: {steps[currentStep].title}
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="mb-8">
          <Card>
            <CardContent className="pt-6">{steps[currentStep].content}</CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <Button onClick={nextStep} disabled={currentStep === steps.length - 1} className="flex items-center gap-2">
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Reference */}
        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-center">Quick Reference</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Equipment</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 21&quot; stringed racquets</li>
                <li>• High-density foam balls</li>
                <li>• Standard pickleball court</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Key Rules</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• First to 11, win by 2</li>
                <li>• Anyone can score</li>
                <li>• Lets are replayed</li>
                <li>• Full court play after serve</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
