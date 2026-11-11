/**
 * Groups prompts from the prompts.chat dataset into friendly categories.
 * The dataset tags prompts with an act (title) only, so we classify by
 * keywords found in the act title plus the first part of the prompt body.
 * Rough by design — good enough for browsing; everything else is "General".
 */

const RULES = [
  ['AI & Agents',
    /\b(ai|a\.i|llm|gpt|chatgpt|claude|gemini|openai|anthropic|copilot|machine learning|deep learning|neural|artificial intelligence|generative|chatbot|prompt engineer|prompt generator|fine-?tun|\brag\b|embedding|token|agent|nlp|data scientist|midjourney|stable diffusion|dall-?e)\b/],
  ['Coding & Development',
    /\b(developer|engineer|programming|programmer|code|coding|software|terminal|regex|linux|devops|database|stack overflow|debug|\bgit\b|\bapi\b|\brest\b|graphql|website|web ?app|full ?stack|front ?end|back ?end|python|javascript|typescript|\bjava\b|c\+\+|react|next\.?js|node\b|express|\bsql\b|query|docker|kubernetes|aws|azure|cloud|microservice|algorithm|data structure|cyber ?security|ethereum|solidity|web3|blockchain|shell|bash|powershell|html|\bcss\b|tailwind|mongodb|postgres|mysql|nosql|unit test|code review|debugging|backend|frontend|saas)/],
  ['Career & Interviews',
    /\b(job|career|interview|resume|résumé|\bcv\b|recruiter|linkedin|cover letter|hiring|\bhire\b|talent|salary|promotion|freelance)/],
  ['Marketing & Growth',
    /\b(marketing|marketer|\bseo\b|social ?media|advertis|growth|brand|copywrit|email campaign|public relations|influencer|sales page|e-?commerce|affiliate|funnel|conversion|landing page|instagram|tiktok|youtube|content calendar|audience|engagement|lead generation|campaign)/],
  ['Business & Strategy',
    /\b(startup|founder|\bceo\b|\bcto\b|\bcoo\b|\bcfo\b|business|entrepreneur|product manager|strateg|consultant|analyst|invest|finance|financial|accountant|legal|lawyer|economist|project manager|scrum|agile|\bokr\b|\bkpi\b|pitch|deck|investor|revenue|b2b|b2c|stakeholder|market research|swot)/],
  ['Writing & Content',
    /\b(writer|writing|journalist|blog|poet|poem|novel|novelist|screenwrit|screenplay|story|storyteller|translat|editor|essay|rhetoric|ghostwrit|proofread|fiction|author|grammar|summar|script for|caption)/],
  ['Design & Creative',
    /\b(design|designer|artist|illustrat|\bui\b|\bux\b|photograph|photo|animat|composer|music|\bfilm\b|architect|interior|logo|\b3d\b|\bgame\b|drawing|paint|craft|florist|calligrap|render|image|visual|aesthetic|typography|font|color palette|colour palette|anime|manga|comic|cartoon|pixel|voxel|wallpaper|poster|sketch|sculpt|cinemat|camera|video|storyboard|collage)/],
  ['Education & Learning',
    /\b(teacher|tutor|education|educational|academic|lecturer|school|learning|student|coach|trainer|mentor|lesson|curriculum|exam|quiz|flashcard|study|homework|math|mathematics|tutorial|flash card)/],
  ['Science & Research',
    /\b(research|experiment|physics|chemistry|biology|quantum|science|scientific|hypothesis|thesis|\blab\b|laboratory|simulation|statistic|dataset|analy)/],
  ['Life & Lifestyle',
    /\b(chef|cook|recipe|nutrition|diet|fitness|travel|yoga|life ?coach|dating|friend|psycholog|therapist|doctor|medical|health|fashion|beauty|home|wine|sommelier|astrolog|fortune|\bpet\b|\bdog\b|\bcat\b|garden|philosoph|buddha|guru|magician|babysitter|nurse|\btea\b|coffee|hotel|tour|workout|gym\b|sleep|habit|parent|family|relationship|lifestyle|skincare|makeup|parenting)/],
];

/**
 * Categorise a prompt. Checks the act title first, then falls back to
 * keywords inside the first ~400 characters of the prompt body.
 */
function categorize(act, prompt = '') {
  const title = String(act || '').toLowerCase();
  for (const [name, re] of RULES) {
    if (re.test(title)) return name;
  }
  const body = String(prompt || '').slice(0, 400).toLowerCase();
  if (body) {
    for (const [name, re] of RULES) {
      if (re.test(body)) return name;
    }
  }
  return 'General';
}

module.exports = {
  categorize,
  CATEGORIES: RULES.map((r) => r[0]).concat('General'),
};
