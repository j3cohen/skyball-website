export interface Product {
  id: string
  name: string
  price: number
  image: string
  description: string
  details: string
}

export const products: Product[] = [
  {
    id: "1",
    name: "SkyBall™ Racket",
    price: 79.99,
    image:
      "/placeholder.svg",
    description: "21-inch stringed racket, perfect for SkyBall™",
    details:
      "Our official SkyBall™ racket is designed for optimal performance. With a 21-inch frame and high-quality strings, it provides the perfect balance of power and control for players of all levels.",
  },
  {
    id: "2",
    name: "SkyBall™ Set",
    price: 24.99,
    image:
      "/placeholder.svg",
    description: "Set of 4 high-density foam SkyBalls™",
    details:
      "Our official SkyBall™ set includes 4 high-density foam balls designed for optimal flight and control. These balls are perfect for both casual play and competitive matches.",
  },
  {
    id: "3",
    name: "SkyBall™ Starter Kit",
    price: 149.99,
    image:
      "/placeholder.svg",
    description: "2 rackets, 4 balls, and a portable net",
    details:
      "Get everything you need to start playing SkyBall™ with our Starter Kit. It includes 2 official rackets, 4 high-density foam balls, and a portable net for easy setup anywhere.",
  },
]

