import bcrypt from 'bcryptjs';
import { db, initDb } from './db.js';

// Idempotent seeding: only populate the catalog when the database is empty.
// Safe to run on every boot — a fresh (persistent) database gets the starter
// catalog once; later restarts never wipe courses your team has added/edited.
const FORCE_RESEED = process.env.FORCE_RESEED === '1';

await initDb();

let skipCatalog = ((await db.prepare('SELECT COUNT(*) c FROM courses').get()).c > 0) && !FORCE_RESEED;
if (skipCatalog) {
  console.log('Catalog already present — skipping course seeding (data preserved).');
} else if (FORCE_RESEED) {
  console.log('FORCE_RESEED=1 — resetting catalog.');
  await db.exec(`
    DELETE FROM reviews;
    DELETE FROM lessons;
    DELETE FROM modules;
    DELETE FROM courses;
    DELETE FROM sqlite_sequence WHERE name IN ('courses','modules','lessons','reviews');
  `);
}

const insCourse = db.prepare(`
  INSERT INTO courses (slug,title,category,provider,level,duration,summary,description,price,old_price,discount,rating,reviews_count,color,icon,outcomes)
  VALUES (@slug,@title,@category,@provider,@level,@duration,@summary,@description,@price,@old_price,@discount,@rating,@reviews_count,@color,@icon,@outcomes)
`);
const insModule = db.prepare(`INSERT INTO modules (course_id,position,title,subtitle) VALUES (?,?,?,?)`);
const insLesson = db.prepare(`INSERT INTO lessons (module_id,position,title,kind,duration,body) VALUES (?,?,?,?,?,?)`);
const insReview = db.prepare(`INSERT INTO reviews (course_id,author,rating,body) VALUES (?,?,?,?)`);

async function course(data, modules = [], reviews = []) {
  if (skipCatalog) return null;
  const defaults = {
    provider: 'The Elevate Learning Institute', level: 'Beginner', duration: '6 weeks',
    old_price: null, discount: null, rating: 4.8, reviews_count: 0, color: 'navy',
    icon: 'target', outcomes: [],
  };
  const row = { ...defaults, ...data, outcomes: JSON.stringify(data.outcomes ?? []) };
  const courseId = (await insCourse.run(row)).lastInsertRowid;
  for (let mi = 0; mi < modules.length; mi++) {
    const m = modules[mi];
    const moduleId = (await insModule.run(courseId, mi + 1, m.title, m.subtitle ?? null)).lastInsertRowid;
    const lessons = m.lessons ?? [];
    for (let li = 0; li < lessons.length; li++) {
      const l = lessons[li];
      await insLesson.run(moduleId, li + 1, l.title, l.kind ?? 'reading', l.duration ?? '05:00', JSON.stringify(l.body ?? {}));
    }
  }
  for (const r of reviews) await insReview.run(courseId, r.author, r.rating, r.body);
  return courseId;
}

// ============================ COURSE 1: Fundraising ============================
const fundraisingQuiz = {
  passScore: 60,
  questions: [
    {
      q: 'What is a donor?',
      options: [
        'Anyone who follows your organization online',
        'A person or entity that contributes resources to support your cause',
        'A staff member responsible for fundraising',
        'A government regulator of nonprofits',
      ],
      answer: 1,
      explanation: 'A donor is any individual, group, or organization that gives money, time, or in-kind resources to support your mission.',
    },
    {
      q: 'What is the primary reason organizations should understand their donors?',
      options: [
        'To increase the number of donations only',
        'To build stronger relationships and create long-term impact',
        'To reduce fundraising costs',
        'To compete with other organizations',
      ],
      answer: 1,
      explanation: 'Understanding donors helps you build authentic relationships that sustain long-term impact, not just one-off gifts.',
    },
    {
      q: 'Which of the following is an example of an intrinsic motivation?',
      options: [
        'Receiving a tax deduction',
        'Getting public recognition',
        'A personal belief in the cause',
        'A free event ticket',
      ],
      answer: 2,
      explanation: 'Intrinsic motivations come from within — like personal values and belief in the cause — rather than external rewards.',
    },
    {
      q: 'What is the most effective way to retain donors?',
      options: [
        'Lower your fundraising goals',
        'Build strong relationships and show impact',
        'Send more fundraising emails',
        'Only contact donors once a year',
      ],
      answer: 1,
      explanation: 'Donor retention comes from building strong relationships and consistently showing the impact of their support.',
    },
    {
      q: 'Which statement is true about donor segmentation?',
      options: [
        'It means treating every donor exactly the same',
        'It groups donors so you can tailor communication and strategy',
        'It is only useful for very large organizations',
        'It replaces the need to thank donors',
      ],
      answer: 1,
      explanation: 'Segmentation groups donors by shared traits so you can tailor stewardship and giving strategies effectively.',
    },
  ],
};

const donorActivity = {
  prompt: 'Match each donor type to the strategy that works best for them.',
  pairs: [
    { left: 'First-time Donors', leftHint: 'New supporters who have just made their first contribution.', right: 'Welcome series & engagement emails' },
    { left: 'Major Donors', leftHint: 'Individuals who make large, significant gifts.', right: 'Personalized stewardship & relationship building' },
    { left: 'Recurring Donors', leftHint: 'Supporters who give regularly over time.', right: 'Thank you messages & impact updates' },
    { left: 'Lapsed Donors', leftHint: "Previous donors who haven't given in a while.", right: 'Re-engagement campaigns & win-back offers' },
  ],
};

await course(
  {
    slug: 'fundraising-strategy-for-nonprofits',
    title: 'Fundraising Strategy for Nonprofits',
    category: 'Fundraising',
    level: 'Beginner', duration: '6 weeks',
    summary: 'Learn how to plan, run, and measure fundraising that builds lasting donor relationships.',
    description: 'This course equips you with a practical, end-to-end fundraising strategy for purpose-driven organizations. Through real examples and actionable frameworks, you will learn to understand your donors, build a compelling case for support, choose the right channels, and measure what matters.',
    price: 20000, old_price: 25000, discount: '20% OFF', rating: 4.9, reviews_count: 214,
    color: 'navy', icon: 'chart',
    outcomes: [
      'Build a complete fundraising strategy', 'Understand and segment your donors',
      'Craft a compelling case for support', 'Choose the right fundraising channels',
      'Steward and retain donors', 'Measure and improve campaign performance',
    ],
  },
  [
    {
      title: 'Introduction to Fundraising Strategy',
      subtitle: 'Get grounded in the fundamentals',
      lessons: [
        { title: 'What is Fundraising Strategy?', kind: 'video', duration: '06:45', body: {
          intro: 'A clear definition of fundraising strategy and why every nonprofit needs one.',
          takeaways: ['Strategy connects mission to money', 'It is a plan, not a single event', 'Everyone in the org plays a part'] } },
        { title: 'The Fundraising Landscape', kind: 'reading', duration: '08:12', body: {
          heading: 'The Fundraising Landscape',
          intro: 'Understand the major sources of funding and how they fit together.',
          points: [
            { icon: 'heart', title: 'Individual Giving', text: 'The largest source of giving for most causes — driven by relationships and trust.' },
            { icon: 'shield', title: 'Grants & Institutions', text: 'Foundations and institutions fund work that aligns with their priorities.' },
            { icon: 'users', title: 'Corporate Partnerships', text: 'Businesses give through sponsorships, matching, and shared-value programs.' },
          ] } },
        { title: 'Key Principles of Successful Fundraising', kind: 'reading', duration: '07:30', body: {
          heading: 'Key Principles', intro: 'The habits that separate sustainable fundraising from one-off appeals.',
          points: [
            { icon: 'heart', title: 'Donor-Centred', text: 'Put the donor’s values and experience at the heart of everything.' },
            { icon: 'shield', title: 'Transparent', text: 'Show exactly how gifts are used and the impact they create.' },
            { icon: 'users', title: 'Relational', text: 'Treat giving as the start of a relationship, not the end of a transaction.' },
          ] } },
      ],
    },
    {
      title: 'Understanding Your Donors',
      subtitle: 'Learn how to identify, understand and segment your donors for better engagement.',
      lessons: [
        { title: 'What Are Donors?', kind: 'video', duration: '09:45', body: {
          intro: 'In this lesson, we’ll explore who donors are, the different types of donors, and why understanding them is key to building strong relationships.',
          takeaways: ['Donors are more than just financial supporters.', 'Different donors have different motivations.', 'Understanding donors helps you build better strategies.'] } },
        { title: 'Understanding Donor Motivations', kind: 'reading', duration: '08:12', body: {
          heading: 'What Drives Donors?',
          intro: 'People give for many reasons. Understanding these motivations helps nonprofits connect with donors in meaningful and authentic ways.',
          points: [
            { icon: 'heart', title: 'Make a Difference', text: 'Donors want to contribute to a cause that creates real impact and improves lives.' },
            { icon: 'shield', title: 'Trust & Credibility', text: 'They give to organizations they trust and believe will use their support responsibly.' },
            { icon: 'users', title: 'Personal Connection', text: 'Donors are more likely to give when they feel emotionally connected to your mission.' },
          ],
          remember: 'When you understand why people give, you can inspire them to give more and stay engaged for the long term.',
          quote: 'A donor who values education may give to empower children in their community.' } },
        { title: 'Donor Segmentation', kind: 'reading', duration: '07:58', body: {
          heading: 'Donor Segmentation', intro: 'Group donors by shared traits so you can tailor your communication and strategy.',
          points: [
            { icon: 'users', title: 'By Giving Level', text: 'Separate major donors from grassroots supporters to tailor stewardship.' },
            { icon: 'heart', title: 'By Engagement', text: 'New, recurring, and lapsed donors each need a different approach.' },
            { icon: 'shield', title: 'By Interest', text: 'Match donors to the programs and outcomes they care about most.' },
          ] } },
        { title: 'Match Donor Types to Strategies', kind: 'activity', duration: '05:00', body: { activity: donorActivity } },
        { title: 'Module 2 Quiz', kind: 'quiz', duration: '05:00', body: { quiz: fundraisingQuiz } },
      ],
    },
    {
      title: 'Building a Compelling Case for Support',
      subtitle: 'Tell a story that moves people to give',
      lessons: [
        { title: 'The Anatomy of a Great Case', kind: 'reading', duration: '06:20', body: { heading: 'The Anatomy of a Great Case', intro: 'A compelling case for support connects need, solution, and impact.', points: [ { icon: 'heart', title: 'The Need', text: 'Make the problem real and urgent.' }, { icon: 'shield', title: 'Your Solution', text: 'Show why your approach works.' }, { icon: 'users', title: 'The Impact', text: 'Prove the difference a gift makes.' } ] } },
        { title: 'Telling Stories with Data', kind: 'video', duration: '07:10', body: { intro: 'Balance emotional storytelling with credible evidence.', takeaways: ['Lead with a person, not a statistic', 'Use data to build trust', 'End with a clear ask'] } },
        { title: 'Writing Your Case Statement', kind: 'reading', duration: '05:45', body: { heading: 'Writing Your Case Statement', intro: 'Draft a one-page case you can adapt across channels.', points: [ { icon: 'heart', title: 'Headline', text: 'One sentence that captures the mission.' }, { icon: 'shield', title: 'Proof', text: 'Two or three pieces of evidence.' }, { icon: 'users', title: 'Call to Action', text: 'Exactly what you want the reader to do.' } ] } },
      ],
    },
    {
      title: 'Fundraising Channels and Tactics',
      subtitle: 'Reach donors where they are',
      lessons: [
        { title: 'Email & Direct Appeals', kind: 'reading', duration: '06:00', body: { heading: 'Email & Direct Appeals', intro: 'The workhorse of nonprofit fundraising.', points: [ { icon: 'heart', title: 'Segment', text: 'Send the right message to the right list.' }, { icon: 'shield', title: 'Personalize', text: 'Use names and giving history.' }, { icon: 'users', title: 'Test', text: 'A/B test subject lines and asks.' } ] } },
        { title: 'Events & Campaigns', kind: 'video', duration: '07:40', body: { intro: 'Plan events and campaigns that build community and revenue.', takeaways: ['Set a clear goal', 'Build a moment of urgency', 'Follow up fast'] } },
        { title: 'Digital & Social Giving', kind: 'reading', duration: '05:30', body: { heading: 'Digital & Social Giving', intro: 'Meet donors on the platforms they already use.', points: [ { icon: 'users', title: 'Social Proof', text: 'Show others giving to inspire action.' }, { icon: 'heart', title: 'Frictionless', text: 'Make giving fast on mobile.' }, { icon: 'shield', title: 'Recurring', text: 'Invite monthly gifts for stability.' } ] } },
        { title: 'Major Gifts & Grants', kind: 'reading', duration: '06:50', body: { heading: 'Major Gifts & Grants', intro: 'High-touch fundraising for transformational support.', points: [ { icon: 'shield', title: 'Research', text: 'Identify and qualify prospects.' }, { icon: 'users', title: 'Cultivate', text: 'Build the relationship before the ask.' }, { icon: 'heart', title: 'Steward', text: 'Report back on impact.' } ] } },
        { title: 'Channel Strategy Quiz', kind: 'quiz', duration: '05:00', body: { quiz: { passScore: 60, questions: [
          { q: 'Which channel typically delivers the most predictable revenue?', options: ['One-off events', 'Recurring monthly giving', 'Viral social posts', 'Cold outreach'], answer: 1, explanation: 'Recurring monthly giving creates a stable, predictable revenue base.' },
          { q: 'What is the first step in major-gift fundraising?', options: ['Make the ask immediately', 'Research and qualify prospects', 'Send a mass email', 'Host a gala'], answer: 1, explanation: 'Major gifts start with research and qualification before cultivation and the ask.' },
        ] } } },
      ],
    },
    {
      title: 'Measuring and Improving Your Strategy',
      subtitle: 'Use data to get better every campaign',
      lessons: [
        { title: 'Fundraising Metrics That Matter', kind: 'reading', duration: '06:15', body: { heading: 'Metrics That Matter', intro: 'Track the numbers that show health and growth.', points: [ { icon: 'shield', title: 'Retention Rate', text: 'How many donors give again.' }, { icon: 'users', title: 'Cost to Raise', text: 'What you spend to raise a naira.' }, { icon: 'heart', title: 'Lifetime Value', text: 'Total value of a donor over time.' } ] } },
        { title: 'Reading Your Dashboard', kind: 'video', duration: '05:55', body: { intro: 'Turn raw data into decisions.', takeaways: ['Compare to last period', 'Look for trends, not noise', 'Act on what you learn'] } },
        { title: 'Continuous Improvement', kind: 'reading', duration: '05:10', body: { heading: 'Continuous Improvement', intro: 'Make a habit of learning and iterating.', points: [ { icon: 'heart', title: 'Reflect', text: 'What worked and why?' }, { icon: 'shield', title: 'Experiment', text: 'Test one change at a time.' }, { icon: 'users', title: 'Share', text: 'Spread learning across the team.' } ] } },
      ],
    },
  ],
  [
    { author: 'Amara O.', rating: 5, body: 'Practical and clear. I rebuilt our donor strategy in a weekend.' },
    { author: 'Tunde A.', rating: 5, body: 'The donor segmentation module alone was worth it.' },
    { author: 'Ngozi E.', rating: 4, body: 'Great frameworks, would love even more Nigeria-specific examples.' },
  ]
);

// ============================ Helper for lighter courses ============================
function simpleModules(specs) {
  return specs.map((s) => ({
    title: s.title,
    subtitle: s.subtitle,
    lessons: s.lessons.map((t, i) => {
      const kind = i === s.lessons.length - 1 && s.quiz ? 'quiz' : (i % 3 === 0 ? 'video' : 'reading');
      const body = kind === 'quiz'
        ? { quiz: s.quiz }
        : kind === 'video'
          ? { intro: `An overview of ${t.toLowerCase()}.`, takeaways: ['Understand the core idea', 'See it applied in practice', 'Know your next step'] }
          : { heading: t, intro: `In this lesson you will explore ${t.toLowerCase()} and how to apply it in your work.`,
              points: [
                { icon: 'heart', title: 'Why it matters', text: 'Grounds the concept in real impact.' },
                { icon: 'shield', title: 'How it works', text: 'A practical, step-by-step approach.' },
                { icon: 'users', title: 'Apply it', text: 'Use it in your organization this week.' },
              ] };
      return { title: t, kind, duration: ['05:30', '06:45', '07:20', '08:12', '04:50'][i % 5], body };
    }),
  }));
}

const genericQuiz = (topic) => ({ passScore: 60, questions: [
  { q: `What is the main goal of ${topic}?`, options: ['To create paperwork', `To drive meaningful, measurable impact`, 'To increase costs', 'To avoid change'], answer: 1, explanation: `${topic} exists to drive meaningful, measurable impact.` },
  { q: `Which is a best practice in ${topic}?`, options: ['Work in isolation', 'Engage stakeholders early and often', 'Skip evaluation', 'Ignore feedback'], answer: 1, explanation: 'Engaging stakeholders early leads to better, more sustainable outcomes.' },
  { q: `What helps you improve over time?`, options: ['Guessing', 'Measuring results and iterating', 'Doing the same thing', 'Avoiding data'], answer: 1, explanation: 'Measuring results and iterating is the engine of continuous improvement.' },
]});

// ============================ Other catalog courses ============================
await course({
  slug: 'communication-for-social-impact', title: 'Communication for Social Impact', category: 'Communication',
  level: 'Beginner', duration: '6 weeks', summary: 'Learn how to communicate your mission, engage stakeholders and drive change.',
  description: 'Master the art of clear, persuasive communication for purpose-driven work — from storytelling and messaging to stakeholder engagement and advocacy.',
  price: 25000, rating: 4.7, reviews_count: 98, color: 'violet', icon: 'megaphone',
  outcomes: ['Craft a clear core message', 'Tell stories that move people', 'Engage diverse stakeholders', 'Communicate across channels', 'Handle difficult conversations', 'Advocate for your cause'],
}, simpleModules([
  { title: 'Foundations of Impact Communication', lessons: ['Why Communication Drives Impact', 'Knowing Your Audience', 'Defining Your Core Message'] },
  { title: 'Storytelling for Change', lessons: ['The Elements of a Great Story', 'Finding and Shaping Stories', 'Story Ethics & Consent', 'Storytelling Quiz'], quiz: genericQuiz('impact storytelling') },
  { title: 'Channels & Campaigns', lessons: ['Choosing the Right Channel', 'Writing for Social Media', 'Building a Campaign'] },
]), [ { author: 'Bola K.', rating: 5, body: 'Transformed how our team talks about our work.' } ]);

await course({
  slug: 'monitoring-evaluation-basics', title: 'Monitoring & Evaluation Basics', category: 'Monitoring & Evaluation',
  level: 'Beginner', duration: '5 weeks', summary: 'Build M&E frameworks that help you measure impact and improve outcomes.',
  description: 'Learn the essentials of monitoring and evaluation — from theory of change and indicators to data collection, analysis, and learning.',
  price: 22000, rating: 4.8, reviews_count: 132, color: 'peach', icon: 'target',
  outcomes: ['Build a theory of change', 'Define strong indicators', 'Collect quality data', 'Analyze and interpret results', 'Report to stakeholders', 'Use findings to improve'],
}, simpleModules([
  { title: 'M&E Foundations', lessons: ['What is M&E?', 'Theory of Change', 'Inputs, Outputs & Outcomes'] },
  { title: 'Indicators & Data', lessons: ['Designing Indicators', 'Data Collection Methods', 'Data Quality', 'M&E Quiz'], quiz: genericQuiz('monitoring and evaluation') },
  { title: 'Analysis & Learning', lessons: ['Analyzing Your Data', 'Reporting Results', 'Learning & Adaptation'] },
]), [ { author: 'Ifeoma U.', rating: 5, body: 'Finally understand indicators. Super practical.' } ]);

await course({
  slug: 'leadership-essentials-for-changemakers', title: 'Leadership Essentials for Changemakers', category: 'Leadership',
  level: 'Beginner', duration: '4 weeks', summary: 'Develop the mindset and practical skills to inspire people, lead teams and drive meaningful change.',
  description: 'This course equips you with the core leadership competencies needed to lead people, projects and purpose-driven organizations. Through practical examples and actionable frameworks, you’ll learn how to inspire, influence and create lasting impact in your community and beyond.',
  price: 20000, old_price: 25000, discount: '20% OFF', rating: 4.8, reviews_count: 126, color: 'green', icon: 'handshake',
  outcomes: ['Build a changemaker mindset', 'Make effective decisions', 'Lead and motivate high-performing teams', 'Manage change and uncertainty', 'Communicate with influence', 'Create sustainable impact'],
}, simpleModules([
  { title: 'The Changemaker Mindset', lessons: ['What Makes a Changemaker', 'Self-Awareness & Values', 'Leading Yourself First'] },
  { title: 'Leading People', lessons: ['Building Trust', 'Motivating Teams', 'Difficult Conversations', 'Leadership Quiz'], quiz: genericQuiz('changemaker leadership') },
  { title: 'Leading Change', lessons: ['Decision-Making Under Uncertainty', 'Driving Change', 'Sustaining Impact'] },
]), [
  { author: 'Chidi N.', rating: 5, body: 'Inspiring and practical. The team exercises are gold.' },
  { author: 'Halima S.', rating: 4, body: 'Loved the mindset module.' },
]);

await course({
  slug: 'sdgs-essentials', title: 'Sustainable Development Goals (SDGs) Essentials', category: 'Sustainability',
  level: 'Beginner', duration: '5 weeks', summary: 'Understand the SDGs and how to integrate them into your projects and programs.',
  description: 'Get a working knowledge of the 17 Sustainable Development Goals and learn to align your programs, measure contribution, and report progress.',
  price: 18000, rating: 4.6, reviews_count: 74, color: 'sand', icon: 'plant',
  outcomes: ['Understand the 17 SDGs', 'Map programs to goals', 'Set SDG-aligned targets', 'Measure contribution', 'Report against the SDGs', 'Communicate your alignment'],
}, simpleModules([
  { title: 'Introduction to the SDGs', lessons: ['The Story of the SDGs', 'The 17 Goals at a Glance', 'Why the SDGs Matter'] },
  { title: 'Applying the SDGs', lessons: ['Mapping Your Work', 'Setting Targets', 'Measuring Contribution', 'SDG Quiz'], quiz: genericQuiz('SDG alignment') },
]), []);

await course({
  slug: 'project-management-for-ngos', title: 'Project Management for NGOs', category: 'Project Management',
  level: 'Beginner', duration: '6 weeks', summary: 'Plan, execute and deliver impact-driven projects on time and on budget.',
  description: 'A practical project-management course tailored to the realities of NGOs and social-impact teams — covering planning, budgeting, risk, and delivery.',
  price: 25000, rating: 4.7, reviews_count: 110, color: 'blue', icon: 'doc',
  outcomes: ['Plan projects with logframes', 'Build realistic budgets', 'Manage risk', 'Lead project teams', 'Track progress', 'Deliver and close projects'],
}, simpleModules([
  { title: 'Project Foundations', lessons: ['The Project Lifecycle', 'Logframes & Workplans', 'Budgeting Basics'] },
  { title: 'Delivery & Control', lessons: ['Managing Risk', 'Tracking Progress', 'Project Closure', 'PM Quiz'], quiz: genericQuiz('project management') },
]), []);

await course({
  slug: 'policy-analysis-fundamentals', title: 'Policy Analysis Fundamentals', category: 'Policy',
  level: 'Beginner', duration: '6 weeks', summary: 'Analyze policy problems and craft evidence-based recommendations.',
  description: 'Learn a structured approach to analyzing policy, weighing options, and communicating recommendations to decision-makers.',
  price: 21000, rating: 4.6, reviews_count: 51, color: 'blue', icon: 'institution',
  outcomes: ['Frame policy problems', 'Gather evidence', 'Weigh policy options', 'Assess trade-offs', 'Write policy briefs', 'Influence decision-makers'],
}, simpleModules([
  { title: 'Understanding Policy', lessons: ['What is Policy Analysis?', 'The Policy Cycle', 'Framing the Problem'] },
  { title: 'Doing the Analysis', lessons: ['Gathering Evidence', 'Comparing Options', 'Writing a Policy Brief', 'Policy Quiz'], quiz: genericQuiz('policy analysis') },
]), []);

await course({
  slug: 'partnerships-stakeholder-engagement', title: 'Partnerships & Stakeholder Engagement', category: 'Leadership',
  level: 'Beginner', duration: '4 weeks', summary: 'Build and manage partnerships that multiply your impact.',
  description: 'Learn to identify, build, and sustain partnerships and engage stakeholders for collective impact.',
  price: 19000, rating: 4.7, reviews_count: 63, color: 'green', icon: 'handshake',
  outcomes: ['Map your stakeholders', 'Build win-win partnerships', 'Negotiate agreements', 'Manage expectations', 'Sustain relationships', 'Measure partnership value'],
}, simpleModules([
  { title: 'Stakeholder Foundations', lessons: ['Who Are Your Stakeholders?', 'Stakeholder Mapping', 'Engagement Strategies'] },
  { title: 'Building Partnerships', lessons: ['Finding the Right Partners', 'Structuring Partnerships', 'Sustaining Trust', 'Partnership Quiz'], quiz: genericQuiz('stakeholder engagement') },
]), []);

await course({
  slug: 'social-entrepreneurship-innovation', title: 'Social Entrepreneurship & Innovation Fundamentals', category: 'Sustainability',
  level: 'Beginner', duration: '6 weeks', summary: 'Turn ideas into sustainable solutions for social problems.',
  description: 'Explore how to design, test, and scale ventures that create social value while staying financially sustainable.',
  price: 23000, rating: 4.8, reviews_count: 87, color: 'sand', icon: 'shield',
  outcomes: ['Spot social opportunities', 'Design a value proposition', 'Test your idea', 'Build a sustainable model', 'Measure social value', 'Plan to scale'],
}, simpleModules([
  { title: 'The Innovation Mindset', lessons: ['What is Social Entrepreneurship?', 'Finding Opportunities', 'Designing Solutions'] },
  { title: 'Building & Scaling', lessons: ['Testing Your Idea', 'Sustainable Models', 'Planning to Scale', 'Venture Quiz'], quiz: genericQuiz('social entrepreneurship') },
]), []);

// ============================ Bootstrap admin (optional, env-driven) ============================
// No demo accounts and no passwords are stored in the codebase. To auto-create a
// super admin on a brand-new/empty database, set these on the server:
//   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, and optionally SEED_ADMIN_NAME.
// On an existing database this does nothing (the account already exists), so it
// never resets a password you've changed.
async function ensureUser({ name, email, password, tagline = 'Platform owner', role = 'super_admin' }) {
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return; // never touch an existing account's password/role
  const hash = bcrypt.hashSync(password, 10);
  await db.prepare('INSERT INTO users (full_name,email,password,tagline,role,active) VALUES (?,?,?,?,?,1)')
    .run(name, email, hash, tagline, role);
  console.log('Created bootstrap super admin:', email);
}

if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
  await ensureUser({
    name: process.env.SEED_ADMIN_NAME || 'Administrator',
    email: String(process.env.SEED_ADMIN_EMAIL).toLowerCase(),
    password: process.env.SEED_ADMIN_PASSWORD,
  });
}

const counts = {
  courses: (await db.prepare('SELECT COUNT(*) c FROM courses').get()).c,
  modules: (await db.prepare('SELECT COUNT(*) c FROM modules').get()).c,
  lessons: (await db.prepare('SELECT COUNT(*) c FROM lessons').get()).c,
  users: (await db.prepare('SELECT COUNT(*) c FROM users').get()).c,
};
console.log('Seed complete:', counts);
