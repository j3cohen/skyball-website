export interface Product {
  id: string
  name: string
  price: number
  images: string[] // Changed from single image to array of images
  description: string
  details: string
  features?: string[] // Optional features array
  stripeLink?: string
}

export const products: Product[] = [
  {
    id: "1",
    name: "SkyBall 3-pack",
    price: 14.99,
    images: ["https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/ball-1.png"],
    description: "Set of 3 high-density foam SkyBalls™",
    details:
      "Our official SkyBall™ 3-pack includes high-density foam balls designed for optimal flight and control. These balls work on most any surface, making them perfect for both casual play and competitive matches.",
    stripeLink: "https://buy.stripe.com/bIYfZg0lK1RC6643cd",
  },
  {
    id: "2",
    name: "SkyBall Racket",
    price: 28.99,
    images: ["https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/racket-1.png"],
    description: "21-inch stringed racket, perfect for SkyBall™",
    details:
      "Our official SkyBall™ racket is designed for optimal performance. With a 21-inch frame and high-quality strings, it provides the perfect balance of power and control for players of all levels.",
    features: [
      "Weight: 190 g (strung)",
      "40 lb string tension",
      "Longer handle length (6 in.)",
    ],
    stripeLink: "https://buy.stripe.com/3cIdR9d7Pf9zb407uyes007",
  },
  {
    id: "3",
    name: "SkyBall Essentials",
    price: 64.99,
    images: [
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/essentials-1.png",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/racket-1.png",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/ball-1.png",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_vegas_kingofthecourt.PNG",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_vegas_serve.PNG",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_nj.jpg",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_vegas_ages.PNG",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/SkyBall_oltc_serve.jpg",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/equipment.jpeg",

      
    ],
    description:
      "Everything you need to play SkyBall on a pickleball court with a net: 2 rackets, 3 balls, and chalk for marking service lines.",
    details:
      "Everything you need to play SkyBall on a pickleball court with a net: 2 rackets, 3 balls, and chalk for marking service lines. Get started with SkyBall™ right away on your local pickleball court!",
    stripeLink: "https://buy.stripe.com/8x2aEXc3L5yZ3BybKOes008",
  },
  {
    id: "4",
    name: "SkyBall Anywhere Kit",
    price: 139.99,
    images: [
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/anywhere-kit-1.png",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/net-2.png",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/net-1.JPG",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/racket-1.png",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/ball-1.png",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_anywhere_grass.jpeg",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_anywhere_nj.jpeg",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_anywhere_central_park.jpeg",
    ],
    description: "1 net, 2 rackets, 2 SkyBall 3-packs",
    details:
      "The complete SkyBall™ experience! Our Anywhere Kit includes a portable net, 2 official rackets, and 2 3-packs of high-density foam balls. Set up and play anywhere!",
    stripeLink: "https://buy.stripe.com/8x200j5Fn2mNegceX0es009",
  },

  {
    id: "5",
    name: "SkyBall Partners Pack",
    price: 109.99,
    description: "4 rackets, 1 SkyBall 3-pack",
    details:
      "The perfect pack for partners! Includes 4 official SkyBall™ rackets and 1 SkyBall™ 3-pack. Ideal for doubles matches or practice sessions with friends.",
    images: [
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/essentials-1.png",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/racket-1.png",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-shop/ball-1.png",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_vegas_kingofthecourt.PNG",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_vegas_serve.PNG",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_nj.jpg",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/skyball_vegas_ages.PNG",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/SkyBall_oltc_serve.jpg",
      "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/equipment.jpeg",

      
    ],
    stripeLink: "https://buy.stripe.com/aFaaEX4Bj1iJdc82aees00k"
  },
]
