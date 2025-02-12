export default function FAQContent() {
  const faqs = [
    {
      question: "What equipment do I need to play SkyBall?",
      answer:
        "To start playing SkyBall, you need SkyBalls (our unique high density foam balls designed for optimal flight and control), a SkyBall racket (21 inch stringed racket), and a SkyBall net (a pickleball net can also be used).",
    },
    {
      question: "Where can I play SkyBall?",
      answer:
        "SkyBall can be played almost anywhere with a flat surface - indoor or outdoor. This includes public parks or playgrounds, school playgrounds, backyard spaces, and indoor gymnasiums.",
    },
    {
      question: "How many players do I need for a game?",
      answer: "SkyBall can be played in several formats: Singles (1v1) or Doubles (2v2).",
    },
    {
      question: "Is SkyBall competitive?",
      answer:
        "While SkyBall is fantastic for casual play, we're building a growing competitive scene! We offer local tournaments, league play in select cities, annual championships, rating systems for competitive players, and school and corporate tournaments.",
    },
    {
      question: "What makes SkyBall different from other racket sports?",
      answer:
        "SkyBall combines the best elements of various racket sports while eliminating common barriers to entry. Our unique ball design and simplified rules make it easier to maintain rallies, while the smaller court size makes it more accessible. The sport emphasizes fun and fitness over technical complexity.",
    },
    {
      question: "Are there health benefits to playing SkyBall?",
      answer:
        "Yes! SkyBall offers numerous health benefits including a full-body workout, improved hand-eye coordination, enhanced agility and reflexes, cardiovascular fitness, low-impact exercise that's easy on joints, and mental sharpness through strategic play.",
    },
    {
      question: "How can I start a SkyBall community in my area?",
      answer:
        "We support new SkyBall communities through starter kits for community organizers, online resources and guides, connection with existing SkyBall groups, support for setting up local leagues, social media promotion for new groups, and tournament organization guidance.",
    },
  ]

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h1>
        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <div key={index} className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">{faq.question}</h2>
              <p className="text-lg">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

