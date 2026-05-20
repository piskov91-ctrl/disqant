export type TestimonialReview = {
  rating: number;
  quote: string;
  /** Already includes leading em dash, e.g. "— P**** Fashion". */
  attribution: string;
};

export const TESTIMONIAL_REVIEWS: readonly TestimonialReview[] = [
  {
    rating: 5,
    quote:
      "Sales went up 31% in our first month using Wear Me. Shoppers who tried it on almost always bought. We wish we had added it sooner.",
    attribution: "— P**** Fashion",
  },
  {
    rating: 5,
    quote:
      "Our return rate dropped by nearly a third after adding Wear Me. Customers finally know what they are getting before it arrives.",
    attribution: "— K**** Boutique",
  },
  {
    rating: 5,
    quote:
      "We added it on a quiet Tuesday. By Friday we had customers messaging us saying how much they loved trying things on. That felt amazing.",
    attribution: "— R**** Clothing",
  },
  {
    rating: 5,
    quote: "Conversion rate up, returns down, happy customers. That is all we needed to know.",
    attribution: "— N**** Fashion",
  },
  {
    rating: 4,
    quote: "Simple to set up, works on every product automatically. No headaches, just results.",
    attribution: "— A**** Shop",
  },
  {
    rating: 5,
    quote:
      "Our average order value increased because customers felt confident enough to buy more than one item at a time.",
    attribution: "— V**** Style",
  },
  {
    rating: 5,
    quote:
      "We run a small boutique and every sale matters. Wear Me helped us close sales we would have otherwise lost to uncertainty.",
    attribution: "— H**** Boutique",
  },
  {
    rating: 5,
    quote: "Customers come back more often now. Once they discover the try-on they use it every visit.",
    attribution: "— T**** London",
  },
  {
    rating: 5,
    quote:
      "Honestly I was skeptical. One line of code sounded too simple. But it works exactly as described and our conversion rate is up.",
    attribution: "— S**** Fashion",
  },
  {
    rating: 5,
    quote:
      "Our customers love it. We get messages from shoppers saying they finally feel confident buying online. That kind of feedback is priceless.",
    attribution: "— L**** Store",
  },
  {
    rating: 5,
    quote:
      "Returns were costing us a fortune. Since adding Wear Me they are down noticeably and our average order value has gone up.",
    attribution: "— T**** Fashion",
  },
];
