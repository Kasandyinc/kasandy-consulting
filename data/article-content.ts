export type ArticleSection = {
  heading?: string
  paragraphs: string[]
}

export type ArticleBody = {
  slug: string
  intro?: string   // opening paragraph(s) before first subheading
  sections: ArticleSection[]
  closing?: string
}

export const articleBodies: ArticleBody[] = [
  {
    slug: 'procurement-bids-losing',
    intro: "Let me say the quiet part out loud. Most bids don't lose because the business wasn't good enough. They lose because of specific, fixable problems — and after reviewing hundreds of bid responses and training over 3,000 entrepreneurs through the BEBC Society's procurement readiness programs, the patterns are as consistent as the sunrise.\n\nHere they are.",
    sections: [
      {
        heading: '1. You answered the question you wished they were asking',
        paragraphs: [
          "Every tender document is specific. It describes a precise need, in a particular format, with particular evaluation criteria. Most unsuccessful bids answer a different question — a general description of the company's capabilities, history, and values.",
          "Here's the discipline that changes everything: read the evaluation criteria before you read anything else in the RFP. Not the background section. Not the Statement of Work. The evaluation criteria. Then write your response to those criteria, in that order, with that weighting. Buyers score what they asked for. They don't give points for impressive things you chose to include.",
          "I've seen strong businesses eliminated in the first round because their narrative didn't map to the scoring rubric. The work was excellent. The proposal just wasn't answering the right question.",
        ],
      },
      {
        heading: '2. Your capability statement was written for you, not for the buyer',
        paragraphs: [
          "A capability statement is not a company biography. Buyers are not reading it to learn your origin story — they're reading it to answer one question: Can this supplier do what I need done, the way I need it done?",
          "If your capability statement doesn't explicitly address the buyer's procurement categories, your delivery timeline, your quality assurance process, and your past performance in relevant work, it is being written for your benefit, not theirs.",
          "The buyers who remember a capability statement are the ones who could answer yes to this question after reading it: 'Do I understand exactly what this company does and whether they've done this before?'",
          "Generic language — 'best-in-class,' 'proven track record,' 'customer-first approach' — communicates nothing and differentiates nothing. Specific evidence does. Replace every general claim with a specific, verifiable one.",
        ],
      },
      {
        heading: '3. You have no documented past performance',
        paragraphs: [
          "Government and corporate buyers are, by nature and by policy, risk-averse. They are spending public funds or shareholder money, and they are accountable for the outcomes. 'We can do this' carries almost no weight against 'here is evidence that we have done this.'",
          "Past performance documentation — client names where you have permission to use them, project scope, delivery timeline, measurable outcomes — is not optional in a competitive submission. It is the evidence that tips the evaluation.",
          "If you don't have it yet, building it is your first strategic priority before your next bid. Pro bono work, subcontracting arrangements, and small pilot projects all count. Document every engagement as if you'll need to cite it in a federal tender — because eventually you will.",
        ],
      },
      {
        heading: '4. The compliance checklist was incomplete',
        paragraphs: [
          "Every RFP contains a mandatory requirements section. Insurance certificates at specified coverage levels. Specific certifications. Business registration documentation. Bonding, where required. If any mandatory item is missing or formatted incorrectly, your bid is disqualified before it is scored. Not evaluated poorly — disqualified.",
          "I cannot overstate how often this happens. Strong submissions, from capable businesses, eliminated because a certificate was expired, a document was in the wrong format, or an item was overlooked in the rush to finish the narrative sections.",
          "Make the compliance checklist the first thing you complete and the last thing you verify. Before you submit, read it again. Then read it one more time.",
        ],
      },
      {
        heading: '5. You submitted and waited',
        paragraphs: [
          "Procurement is a relationship game. That doesn't mean anything improper. It means that buyers who have met a supplier at an industry day, received a capability statement proactively, or had a brief pre-procurement conversation have context that makes a bid more legible when it arrives.",
          "A cold bid from a business the buyer has never encountered competes at a structural disadvantage — not because the work would be worse, but because trust is part of the evaluation in ways that don't always appear in the scoring rubric.",
          "Start building buyer relationships before you need them. Attend pre-proposal conferences. Submit unsolicited capability statements to the departments that buy what you sell. Get registered in the procurement portals that buyers search. Do this consistently, and the next time a relevant tender is posted, your name will already be familiar.",
        ],
      },
      {
        heading: "6. You're not using the question period — and it could be buying you time",
        paragraphs: [
          "This one is almost entirely unknown among new bidders, and it is one of the most strategically valuable tools available to you in the entire procurement process.",
          "Most federal tenders — and many provincial and corporate ones — have a formal question period. Before the bid deadline, there is a window of time during which bidders can submit written questions to the contracting authority. The buyer is required to answer every question asked. And here is the part that changes everything: those answers are posted publicly, typically as an amendment to the original tender on buyandsell.gc.ca, where every bidder can see them.",
          "Every serious bidder should be reading the questions other suppliers ask — and asking their own. The Q&A amendment is often as important as the original RFP.",
          "Read the tender carefully before the question period closes. Note every ambiguity, every term you'd interpret differently from someone else, every scope element that isn't entirely clear. Then ask. Ask specifically. Ask in detail. If the evaluation criteria aren't precise enough to know exactly how you'll be scored on a particular section — ask how that section will be evaluated.",
          "There is a secondary benefit that most bidders miss entirely: if the volume or complexity of questions asked by all bidders is significant — particularly if they reveal that the original document was unclear or incomplete — the contracting authority will often issue an amendment that extends the bid deadline. This happens regularly on federal tenders. It's not guaranteed, and you shouldn't rely on it. But asking substantive questions is one of the few legitimate ways to create more preparation time when the original timeline is tight.",
          "There is also a credibility signal embedded in this. Buyers notice which suppliers are engaging seriously with the tender. A well-formulated, specific question demonstrates that you have read the document carefully, that you understand the scope, and that you intend to submit a serious response.",
          "A few practical guidelines: Ask early — don't wait until the last day of the question window. Ask specific questions about evaluation criteria, scope definition, mandatory requirements, and deliverable formats. Read all the answers posted, not just your own. If an answer changes your understanding of the scope significantly, review your response in light of the amendment before submitting.",
          "The question period is not a loophole. It is a designed feature of the procurement process — one that exists specifically to ensure bidders have the information they need to submit accurate, competitive responses. Use it.",
        ],
      },
    ],
    closing: "All six of these are fixable. None of them require years of experience or an expensive consultant. They require a systematic approach and someone who will tell you the truth about what buyers are actually looking at.\n\nThat's exactly what I built the BEBC Society procurement readiness program to do — and what every coaching engagement at Kasandy Consulting starts with. Not encouragement. An honest audit.\n\nIf you'd like to know which of these is holding your business back specifically, start with a Discovery Session. Ninety minutes. A written action plan. And the truth.",
  },

  {
    slug: 'what-buyers-look-for',
    intro: "'We are a certified diverse supplier' is not a competitive differentiator. It is a prerequisite. The certification gets you into the room. What happens once you're in the room is a different conversation entirely — and it's the one most diverse supplier programs never prepare you for.\n\nI've worked directly with procurement teams, trained buyers and suppliers on both sides of the table, and spent years designing curriculum that tries to close this gap. Here's what actually separates the suppliers who convert diversity certifications into contracts from the ones who achieve certification and never hear back.",
    sections: [
      {
        heading: 'Clarity before credentials',
        paragraphs: [
          "Buyers don't read capability statements looking for impressive credentials. They're busy people with a specific procurement need and a stack of submissions to review. The question running through their head is not 'Is this company impressive?' It's 'Do I understand what this company does, and would they fit my procurement category?'",
          "If your submission requires the buyer to work to understand what you do, they won't. They'll move on. Clarity — about what you sell, who you've sold it to, what you deliver and how — is the first and most important filter.",
        ],
      },
      {
        heading: 'Evidence over assertion',
        paragraphs: [
          "'Best-in-class service.' 'High-quality deliverables.' 'A proven track record of excellence.' These phrases appear in virtually every submission and are evaluated by virtually no buyer. They are noise.",
          "What buyers remember — and what distinguishes the submissions they flag for follow-up — is specific evidence. A client name or industry. A project scope with scale and outcome. A delivery record with timeline and result.",
          "One precise example of past work — with scope, client type, and outcome — changes how a submission reads. It shifts the buyer's mental category from 'promising company' to 'company that has done this before.'",
          "This is particularly important for diverse suppliers who may be newer to formal procurement. The absence of past performance documentation is one of the most common reasons certified businesses don't advance past initial screening. If you haven't started building your past performance library yet, start now — every project, every client, every outcome. Document them as if you'll need to cite them in a federal submission.",
        ],
      },
      {
        heading: 'A match between your offer and their categories',
        paragraphs: [
          "The most common preventable miss in supplier diversity submissions: a supplier submits into a category where the buyer doesn't actually purchase what they're selling. This happens because suppliers target buyers by industry or geography rather than by procurement category.",
          "Before any submission, verify that your product or service maps precisely to the buyer's procurement categories. In federal procurement, this means understanding UNSPSC codes and Commodity Identifiers. In corporate procurement, it means reviewing the company's supplier diversity program focus areas before approaching their supplier diversity team.",
          "If you're not coded correctly in supplier databases, you're invisible to buyer searches — regardless of your certifications. This is a five-minute fix with significant consequences either way.",
        ],
      },
      {
        heading: 'The relationship behind the paperwork',
        paragraphs: [
          "Many supplier diversity programs involve a human review step alongside or before automated matching. Supplier diversity leads, procurement officers, and category managers who have met a supplier at an industry event, received a proactive outreach, or had a conversation at a conference bring context to that review that the paperwork alone can't create.",
          "This isn't about knowing the right people in an inappropriate sense. It's about being present in the ecosystems where buyers look for suppliers. National supplier diversity conferences, government outreach events, corporate supplier days — these are not networking exercises. They are the relationship layer that makes the paperwork count.",
          "The goal of supplier diversity submissions is not to prove you are diverse — that's the certification's job. The goal is to convince a specific buyer that your business is the right choice for a specific need. Focus on that, and the rest follows.",
        ],
      },
    ],
  },

  {
    slug: 'grant-dependency-trap',
    intro: "I've had this conversation more times than I can count. An Executive Director, smart and mission-driven, tells me their organization is doing important work but is in a precarious funding position. Two or three funders account for 75 to 85 percent of their revenue. Every strategic plan for the past five years has listed 'revenue diversification' as a goal. Nothing has changed.\n\nThe trap is self-reinforcing. The organization knows it's vulnerable. But addressing that vulnerability requires time, energy, and investment — resources that are entirely consumed by the existing funding cycle. So the next grant cycle starts, everyone gets busy, and the diversification conversation gets deferred for another year.\n\nI've watched this pattern play out in organizations of every size, every sector, and every mission. And I've watched what happens when it finally breaks. Here are the three paths that actually work.",
    sections: [
      {
        heading: 'Path 1: Build earned revenue on the back of what you already do',
        paragraphs: [
          "Most non-profits are sitting on program expertise that has earned revenue potential they've never explored. The financial literacy program that community members pay a nominal fee for. The professional development curriculum that corporate partners would pay a training rate for. The evaluation framework that peer organizations would license. The facilitation expertise that government agencies would contract.",
          "Earned revenue doesn't mean abandoning your mission. It means finding the intersection between what you do well and what someone — typically a different audience than your primary beneficiaries — will pay for. The key word is audience. Most non-profits have only ever thought about two categories of people: clients and funders. Earned revenue usually comes from a third: partners, adjacent professionals, or institutions who benefit from the organization's expertise without being its direct beneficiaries.",
          "Start small. One fee-for-service contract won't solve your diversification problem. But it builds the muscle and the mindset — and it often opens doors to a category of revenue the organization didn't know was available to it.",
        ],
      },
      {
        heading: 'Path 2: Build a donor program before you need it',
        paragraphs: [
          "The worst time to start an individual donor program is when you're in a funding crisis. The best time is right now, if you don't have one.",
          "A sustainable individual donor program takes eighteen to twenty-four months to build to the point where it materially changes your revenue picture. The reason most organizations wait too long to start is that the board sees the investment but not the return — because the return is slow and the timeline is long.",
          "Organizations that made the investment in individual donor programs three years ago are navigating today's challenging funder environment significantly better than those that didn't. That's not coincidence.",
          "Start with what you have. A list of volunteers. Past event attendees. Community members who've benefited from your programs and might want to give back. These are the seeds of a donor community. They don't need to start with major gifts. They need to start.",
        ],
      },
      {
        heading: 'Path 3: Change the funder conversation',
        paragraphs: [
          "Many organizations are grant-dependent because they've never explicitly asked their funders for what they actually need. Unrestricted funding. Multi-year agreements. Infrastructure support.",
          "Funders who are serious about long-term impact have a strong interest in the organizations they fund being stable and financially resilient. That creates an opening for a different kind of conversation. I've seen organizations change their funder relationship not by adding a new line to their budget but by being honest about their structural challenges and asking directly for the kind of support that would address them.",
          "Sometimes the answer is no. But more often, the answer is a more productive conversation than the one that was happening before.",
          "None of these paths is quick. Breaking grant dependency requires intentional strategy, board alignment, and patience. But every organization I have worked with that has made a genuine commitment to this work has seen their financial position transform over two to three years. The first step is an honest audit of where your money actually comes from — not where the strategic plan says it should come from. Where it actually comes from, today.",
        ],
      },
    ],
  },

  {
    slug: 'kenyan-business-canada',
    intro: "I was born in Kenya. I built businesses in Canada — first in retail on Granville Island, then in consulting, then in building the infrastructure of a national non-profit that now supports thousands of entrepreneurs across the country. I know both sides of this story from the inside.\n\nAnd I've watched the same thing happen dozens of times: a Kenyan entrepreneur with a genuinely competitive product or service, real drive, and no idea that the Canadian procurement market has a specific entry architecture. Not a vague set of preferences. An actual architecture — with formal portals, certification pathways, evaluation frameworks, and compliance requirements. Not knowing it costs people years. Sometimes it costs them the opportunity entirely.",
    sections: [
      {
        heading: 'First, the honest context',
        paragraphs: [
          "Canada's procurement market is large, accessible, and genuinely interested in diverse and international suppliers. Government departments at federal, provincial, and municipal levels are required to consider procurement as an economic development tool. Many corporate buyers have supplier diversity commitments and are actively looking to expand their supplier base.",
          "The opportunity is real. So is the competition. And the system has a learning curve that is steep if you try to navigate it alone and manageable if you understand the structure.",
        ],
      },
      {
        heading: 'Step 1: Choose your sector and stay there',
        paragraphs: [
          "The single most common mistake international entrants make is trying to position their business too broadly. Buyers search by category. They evaluate by category. Pick the sector where your competitive advantage is clearest and your Canadian market fit is strongest. Build your Canadian credibility in that sector before expanding.",
        ],
      },
      {
        heading: 'Step 2: Understand the procurement architecture',
        paragraphs: [
          "At the federal level, buyandsell.gc.ca is the primary portal — it lists tenders, standing offers, and supplier registration opportunities. Provincial governments have their own equivalents (BC Bid, MERX, and others). If you're not registered, you don't exist in buyer searches. Registration is free. It is step one.",
        ],
      },
      {
        heading: 'Step 3: Get the compliance documentation right',
        paragraphs: [
          "Business registration, GST/HST number, appropriate insurance levels, WSIB compliance, and any sector-specific certifications. Canadian buyers verify these before any procurement conversation progresses. Missing documentation is one of the most common disqualifiers for international entrants — and one of the easiest to prevent.",
        ],
      },
      {
        heading: 'Step 4: Write a Canadian capability statement',
        paragraphs: [
          "Canadian buyers are accustomed to a specific format: core competencies by procurement category, past performance with outcomes, differentiators stated as evidence, and contact information. If your capability statement reads like a general business introduction or was designed for a different market, rewrite it.",
        ],
      },
      {
        heading: 'Step 5: Certify strategically',
        paragraphs: [
          "Supplier diversity certifications open specific doors with specific buyers. CAMSC connects certified suppliers with major corporations. CCAB is relevant for Indigenous businesses. WBE Canada certifies women-owned businesses. The BEBC Society certifies Black-owned businesses. Research which certifying bodies are recognized by the specific buyers you're targeting before investing time and fees.",
        ],
      },
      {
        heading: 'Step 6: Activate the diaspora network',
        paragraphs: [
          "The Kenyan-Canadian business community is substantial, well-connected, and genuinely supportive of market entrants who show up prepared. These relationships provide the fastest path to buyer introductions, cultural intelligence, and first contracts. Engaging them is not optional. It's strategic.",
        ],
      },
      {
        heading: 'Step 7: Think long about relationship',
        paragraphs: [
          "Canadian procurement relationships develop slowly and last a long time. The investment in building buyer relationships pays dividends over a much longer horizon than a single contract. Most international entrants are thinking about the next submission. The businesses that succeed long-term are thinking about the next three years of relationship.",
          "Canada is one of the most accessible major markets in the world for internationally-qualified suppliers who understand the system. The learning curve is real. But it's a defined curve, not an endless maze.",
          "The Kenya-Canada Procurement Readiness Seminar exists because I know this pathway and I know how much time gets wasted when you try to figure it out alone. Everything above — the certifications, the portals, the capability statement format, the diaspora network — we go through all of it in two days. With examples, templates, and the conversations that actually move things forward.",
        ],
      },
    ],
  },

  {
    slug: '3000-entrepreneurs',
    intro: "When I designed the first version of what would become Canada's first supplier-focused procurement readiness course, through the BEBC Society in 2020, I thought the main barrier was information. Entrepreneurs didn't know how government procurement worked. So I built a curriculum that explained all of it.\n\nThen something interesting happened. We trained hundreds of entrepreneurs who understood the system — and most of them still weren't submitting bids. Four years and over 3,000 program participants later, I understand why. And the answer changed how I think about procurement training, coaching, and what it actually takes to change outcomes.",
    sections: [
      {
        heading: "Lesson 1: Knowledge transfers. Behaviour doesn't.",
        paragraphs: [
          "A two-day workshop that covers everything a supplier needs to know about procurement will produce, in most participants, a much clearer understanding — and little immediate change in what they actually do. Knowledge is not the same as habit. The change I saw when we added individual coaching alongside group training was significant. Not because coaching added new information. Because it added accountability, a specific next step, and someone who would ask 'did you do it?' the following week.",
        ],
      },
      {
        heading: 'Lesson 2: The certification problem is real but widely misunderstood',
        paragraphs: [
          "'Get certified' is the most common piece of advice diverse business owners receive. It's correct advice with an incomplete explanation. Certification is a prerequisite, not a pipeline. A diversity certification confirms that a buyer's diverse supplier commitment can apply to transactions with your business. It does not connect you with buyers. It does not notify anyone that you exist.",
          "The businesses that get certified and then wait for the phone to ring are not making a naive mistake. They were told — explicitly or implicitly — that certification was the destination. It's an important stop on a longer journey.",
          "The curriculum we built at BEBC Society is explicit about this now. Certification is module two. Modules three through eight are about what you do after you're certified.",
        ],
      },
      {
        heading: 'Lesson 3: The businesses that win have one thing in common',
        paragraphs: [
          "Across thousands of participants and the documented contract wins from our programs — seventeen to twenty-one businesses reporting procurement contracts secured, some in the millions of dollars — I've looked hard for the common factor. It's not sector, geography, or years in business. The businesses that win are the ones that pick a specific buyer, study that buyer's procurement patterns, adapt their positioning to match, and keep showing up in the buyer's ecosystem consistently over time.",
          "Most businesses cast wide and try multiple categories simultaneously. When nothing immediately comes back, they conclude that procurement doesn't work for businesses like theirs. It does. It just doesn't work fast, and it doesn't work broadly. It works deep.",
        ],
      },
      {
        heading: 'Lesson 4: The system has real structural failures and individual businesses can still succeed within it',
        paragraphs: [
          "Incumbent advantages are baked into procurement vehicles that require demonstrated prior performance — a genuine catch-22 for new entrants. Informal buyer-supplier relationships create invisible barriers. Financial instrument requirements disproportionately exclude smaller businesses. These things are true. They require policy reform, and I advocate for that reform actively.",
          "And — both things can be true simultaneously — individual businesses can make significant progress within the current system, with the right preparation and strategy. I know this because I've watched it happen, repeatedly, with businesses that had no particular advantage going in except the willingness to do the work systematically.",
          "The entrepreneurs who succeed understand both realities: the structural constraints, so they can navigate around them — and the genuine opportunities, so they can pursue them with everything they have.",
        ],
      },
    ],
  },

  {
    slug: 'supplier-diversity-market-correction',
    intro: "I want to reframe something. Because the current framing is producing well-intentioned programs with underwhelming results — consistently, across sectors and jurisdictions, in ways that feel less like coincidence and more like a structural problem.\n\nSupplier diversity is widely discussed — in corporate boardrooms, government briefings, ESG reports, and industry conferences — as a form of business generosity. A giving program. A way for large organizations to support smaller, underrepresented businesses out of social conscience.\n\nThis framing is not only wrong. It's harmful.",
    sections: [
      {
        heading: 'The accurate framing',
        paragraphs: [
          "Markets function best when qualified participants can compete on equal terms. When systems — through network exclusion, information asymmetry, procurement architecture, historical discrimination, or structural bias — prevent qualified suppliers from competing, they produce outcomes that are worse for buyers, worse for the economy, and worse for the communities those systems are supposed to serve.",
          "Supplier diversity programs exist to correct a market failure. Not to be charitable. To be accurate. A buyer who consistently awards contracts to the same ten suppliers because those are the companies they've always worked with — without systematically assessing whether better suppliers exist elsewhere — is not exercising good procurement judgment. They are reproducing inertia.",
        ],
      },
      {
        heading: 'What the research actually shows',
        paragraphs: [
          "The business case for supplier diversity is not contested at the level it is sometimes treated as contested. Research has consistently documented that supply chain diversity correlates with supply chain resilience, innovation, and price competitiveness. Diverse suppliers introduce competition that drives value for buyers. They serve markets that large incumbent suppliers don't effectively reach. They generate economic multipliers in communities that have historically been excluded.",
          "None of this is surprising from first principles. More competitors means more competition means better outcomes for buyers. The charitable framing obscures this. When supplier diversity is framed as generosity, the question becomes 'How much are we willing to give?' When it's framed accurately — as a market correction — the question becomes 'What are we losing by not accessing the full supplier market?'",
        ],
      },
      {
        heading: 'The consequences of the wrong framing',
        paragraphs: [
          "Framing supplier diversity as charity produces predictable organizational responses. It gets housed in CSR departments rather than procurement. It gets measured by inputs — diversity spend percentages — rather than by actual contract awards. It gets designed to demonstrate commitment rather than change purchasing patterns. And it gets cut when business conditions change.",
          "The entrepreneurs I work with are not asking for favours. They are asking for a fair evaluation. They want to be assessed on their capabilities, their track record, and their value — not screened out before the evaluation begins by systems that were designed before they were ever considered.",
        ],
      },
      {
        heading: 'What effective supplier diversity actually requires',
        paragraphs: [
          "Supplier diversity that produces real, sustained economic outcomes looks different from the programs that produce diversity spend percentages. It includes buyer accountability — procurement officers evaluated on diverse supplier outcomes, not just process compliance. It includes supply chain development — investment in closing readiness gaps rather than waiting for diverse suppliers to close them alone. It includes long-term contracting relationships that allow suppliers to build the capacity to serve larger contracts over time. And it includes honest reporting — actual contract awards, not just spend allocated to programs.",
          "I advocate for all of this, actively, in every government and corporate engagement I take on. Because the work my clients do — getting certified, building capability statements, preparing bids, navigating the system — should happen on the foundation of a system that's actually designed to work.",
          "Until it is, I'll keep helping entrepreneurs navigate the system as it currently exists, while pushing for the reforms that would make the navigation less necessary. Both things matter. Both things are the work.",
        ],
      },
    ],
  },
]
