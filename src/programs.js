/**
 * AIGrowSutra flagship programs. Single source of truth for the
 * /api/programs endpoint. The marketing pages (public/) contain the
 * hand-written long-form versions of this data.
 */

const programs = [
  {
    id: 'ai-training',
    title: 'AI Training Foundations',
    icon: 'brain',
    level: 'Beginner friendly',
    duration: '4 weeks',
    accent: 'amber',
    tagline: 'Prompt engineering, LLM fundamentals and daily AI workflows that make you 10x faster.',
    highlights: [
      'Prompt engineering from zero to advanced',
      'ChatGPT, Claude, Gemini & Llama workflows',
      'Context windows, hallucinations & LLM limits',
      'RAG in plain English — no PhD required',
    ],
  },
  {
    id: 'agent-building',
    title: 'AI Agent Building',
    icon: 'bot',
    level: 'Intermediate',
    duration: '6 weeks',
    accent: 'teal',
    tagline: 'Design and ship multi-step AI agents that use tools, browse, and automate real work.',
    highlights: [
      'Tools, function calling & the MCP standard',
      'Multi-step planning and agent loops',
      'Build agents with LangChain & n8n',
      'Evals, guardrails and failure debugging',
    ],
  },
  {
    id: 'website-building',
    title: 'Full-Stack Website Building',
    icon: 'browser',
    level: 'Beginner to Pro',
    duration: '8 weeks',
    accent: 'violet',
    tagline: 'Ship production websites end-to-end: frontend, backend, database, and free deployment.',
    highlights: [
      'HTML, CSS, JavaScript and React/Next.js',
      'Node.js APIs, Express and REST design',
      'Databases: SQLite, Postgres & free Neon',
      'Free hosting & domains on Vercel/Render',
    ],
  },
  {
    id: 'ai-expert',
    title: 'AI Expert Track',
    icon: 'medal',
    level: 'Advanced (flagship)',
    duration: '12 weeks',
    accent: 'rose',
    tagline: 'The complete journey: everything above plus RAG pipelines, fine-tuning and AI product strategy.',
    highlights: [
      'All three core programs included',
      'RAG pipelines & fine-tuning workshops',
      'AI product strategy & cost engineering',
      'Portfolio, certification & 1:1 mentorship',
    ],
  },
];

const programIds = programs.map((p) => p.id);

module.exports = { programs, programIds };
