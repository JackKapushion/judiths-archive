export interface SoftaDocument {
  id: string
  title: string
  filename: string
  type: 'pdf' | 'image'
  category: string
}

export const documents: SoftaDocument[] = [
  // Writings, Speeches & Correspondence (6)
  { id: '9d', title: 'Kosmos Essay Draft v2 - Conditioning and Disruptive Learning Technology', filename: '9d.pdf', type: 'pdf', category: 'Writings, Speeches & Correspondence' },
  { id: '13b', title: "Burlington College Convocation - Judith Orloff's Schedule, Speech, and Research Notes (2015)", filename: '13b.pdf', type: 'pdf', category: 'Writings, Speeches & Correspondence' },
  { id: '13c', title: 'Letters to W. Edwards Deming from Judith Orloff (1992)', filename: '13c.pdf', type: 'pdf', category: 'Writings, Speeches & Correspondence' },
  { id: '21', title: 'Secrets - Presentation Visual Notes (May 1984)', filename: '21.pdf', type: 'pdf', category: 'Writings, Speeches & Correspondence' },
  { id: '21a', title: 'Emotional Intelligence Project - Interview with Judith Orloff', filename: '21a.pdf', type: 'pdf', category: 'Writings, Speeches & Correspondence' },
  { id: '27', title: 'W. Edwards Deming Letter to Judith Orloff-Falk (February 14, 1992)', filename: '27.pdf', type: 'pdf', category: 'Writings, Speeches & Correspondence' },

  // Transformation Programs (12)
  { id: '4a', title: 'ETP II Transformation - Student Workbook and Participant Handout Collection', filename: '4a.pdf', type: 'pdf', category: 'Transformation Programs' },
  { id: '4b', title: "ETP II Transformation - Session 1 Instructor's Manual", filename: '4b.pdf', type: 'pdf', category: 'Transformation Programs' },
  { id: '4g', title: "Universe Game - Synergy and Heart's Desire Exercise", filename: '4g.pdf', type: 'pdf', category: 'Transformation Programs' },
  { id: '4h', title: '"Because There\'s So Much To Learn And So Little Time" - ETP II Session Letter', filename: '4h.pdf', type: 'pdf', category: 'Transformation Programs' },
  { id: '4i', title: "ETP II Transformation - Session 2 Instructor's Manual (Version A)", filename: '4i.pdf', type: 'pdf', category: 'Transformation Programs' },
  { id: '4j', title: "Transformation - Session 2 Instructor's Manual (Version B)", filename: '4j.pdf', type: 'pdf', category: 'Transformation Programs' },
  { id: '4k', title: 'ETP II Session Two - Program Outline', filename: '4k.pdf', type: 'pdf', category: 'Transformation Programs' },
  { id: '4l', title: "ETP I Transformation - Session 2 Instructor's Manual", filename: '4l.pdf', type: 'pdf', category: 'Transformation Programs' },
  { id: '4m', title: 'The Elements of Magic - Chapter Four (Earth, Air, Fire, Water)', filename: '4m.pdf', type: 'pdf', category: 'Transformation Programs' },
  { id: '4n', title: "ETP II Transformation - Session 2 Instructor's Manual (Version C)", filename: '4n.pdf', type: 'pdf', category: 'Transformation Programs' },
  { id: '4o', title: 'The Elements of Magic - Chapter Four (Earth, Air, Fire, Water)', filename: '4o.pdf', type: 'pdf', category: 'Transformation Programs' },
  { id: '5b', title: 'ETP II Transformation - Session 3 Complete Packet', filename: '5b.pdf', type: 'pdf', category: 'Transformation Programs' },

  // Choices & Personal Development (10)
  { id: '4c', title: 'Sources of Information - Head, Heart, and Soul (Chapter 10)', filename: '4c.pdf', type: 'pdf', category: 'Choices & Personal Development' },
  { id: '4d', title: 'The 7-11 Game - Ethics and Choices Role Play Exercise', filename: '4d.pdf', type: 'pdf', category: 'Choices & Personal Development' },
  { id: '4e', title: 'Learning Choices - Crossing the Abyss Game', filename: '4e.pdf', type: 'pdf', category: 'Choices & Personal Development' },
  { id: '4f', title: 'Mom and Dad Game - Parental Identity Exercise', filename: '4f.pdf', type: 'pdf', category: 'Choices & Personal Development' },
  { id: '10a', title: 'Evening Series Manual - Instructor Outlines and Logistics Guidelines', filename: '10a.pdf', type: 'pdf', category: 'Choices & Personal Development' },
  { id: '10b', title: 'Personal Responsibility, Emotional Mastery and Success - A New Beginning', filename: '10b.pdf', type: 'pdf', category: 'Choices & Personal Development' },
  { id: '11a', title: "ETP Instructor's Manual - DRAFT (Sessions 1-8)", filename: '11a.pdf', type: 'pdf', category: 'Choices & Personal Development' },
  { id: '11b', title: 'Graduate Training Outline - Choices Weekend Follow-up', filename: '11b.pdf', type: 'pdf', category: 'Choices & Personal Development' },
  { id: '11c', title: "The Choices Weekend - Instructor's Manual", filename: '11c.pdf', type: 'pdf', category: 'Choices & Personal Development' },
  { id: '15a', title: 'The Choices Weekend - Personal Discovery Form', filename: '15a.pdf', type: 'pdf', category: 'Choices & Personal Development' },

  // Radical Love & Radical Choices (13)
  { id: '9b', title: 'Radical Choices - Leadership in Recovery Day One Workbook', filename: '9b.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '9c', title: 'Emotional Literacy - Marketing Pitch Collection (Three Branding Eras)', filename: '9c.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '12a', title: 'Natural Leadership: A Core Competency of Clarity', filename: '12a.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '12b', title: 'Awakened Relationships: A Core Competency of Unconditional Love', filename: '12b.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '13e', title: 'Radical Love Foundation - Executive Leadership Development Presentation', filename: '13e.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '15b', title: 'Radical Choices - Leadership in Recovery Day Two Workbook', filename: '15b.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '15c', title: 'Radical Choices - Train the Trainer Certification Program, Session Three: "Beyond Suffering - The Naked Bald Truth"', filename: '15c.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '16b', title: 'Radical Love Foundation - Readings, Poems, and Workshop Teaching Materials', filename: '16b.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '16c', title: 'Radical Love Participant Workbook', filename: '16c.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '18', title: 'The Art & Science of Mindful Living - Participant Workbook', filename: '18.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '18a', title: 'The End of Your World - Adyashanti Interview Transcript (Sounds True)', filename: '18a.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '21b', title: "Conditioning's Last Stand - Integrity", filename: '21b.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },
  { id: '21c', title: 'Draft Introduction to the Learning Architecture - Radical Choices', filename: '21c.pdf', type: 'pdf', category: 'Radical Love & Radical Choices' },

  // Corporate Leadership Training & Educational Discoveries (14)
  { id: '7', title: 'Mastery of Business Leadership (MBL) - Complete Program Curriculum', filename: '7.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '9a', title: 'Choices for Success - Participant Workbook', filename: '9a.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '13d', title: 'Radical Love Foundation - Workshop Materials, Conference Proposals, Teaching Content, and Bios', filename: '13d.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '17', title: 'Business & You - Seminar Participant Workbook', filename: '17.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '19', title: 'Applying Accelerated Learning to Course Design - Training Workbook', filename: '19.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '19a', title: 'The Accounting Game - Book Publishing Documents', filename: '19a.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '20a', title: "WHY's Guide to the Human Side of CPR - Complete Training Program", filename: '20a.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '22', title: 'The Accounting Game - Instructor Manual', filename: '22.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '24', title: 'Core Technology Programs - Train-The-Trainer (TTT) Workbook', filename: '24.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '25', title: 'The Nature of Conflict - Course Materials', filename: '25.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '25a', title: 'The Model for Change - Supplementary Materials', filename: '25a.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '25b', title: 'The Model for Change For Managers - Facilitator Guide', filename: '25b.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '25c', title: 'Breakthrough - Model for Change Participant Workbook', filename: '25c.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },
  { id: '27a', title: 'The Art and Science of Leadership - Participant Workbook', filename: '27a.pdf', type: 'pdf', category: 'Corporate Leadership Training & Educational Discoveries' },

  // Academic & Scholarly Work (8)
  { id: '1', title: 'The Power of the Sacred Living Letters: The Kabbalah Book of Change', filename: '1.pdf', type: 'pdf', category: 'Academic & Scholarly Work' },
  { id: '13a', title: 'VICI Opening Ceremony Speech - "In Praise of Venture" by Sister Elizabeth Candon', filename: '13a.pdf', type: 'pdf', category: 'Academic & Scholarly Work' },
  { id: '2a', title: 'Dissertation Critique - Nowhere Man by Tracy John Skipp', filename: '2a.pdf', type: 'pdf', category: 'Academic & Scholarly Work' },
  { id: '2b', title: 'Mindfulness and Insight Action Research Project', filename: '2b.pdf', type: 'pdf', category: 'Academic & Scholarly Work' },
  { id: '3a', title: 'Dissolving Adverse Childhood Conditioning through a Mindfulness Curriculum for Parents and Children from Preschool through High School', filename: '3a.pdf', type: 'pdf', category: 'Academic & Scholarly Work' },
  { id: '3g', title: 'Assessment of Montessori Teacher Training Using Theories of Change', filename: '3g.pdf', type: 'pdf', category: 'Academic & Scholarly Work' },
  { id: '5a', title: '"The Global Brain" by Peter Russell (Excerpt - Chapter 1: The Blue Pearl)', filename: '5a.pdf', type: 'pdf', category: 'Academic & Scholarly Work' },
  { id: '20', title: 'Fielding Graduate University EdD Application', filename: '20.pdf', type: 'pdf', category: 'Academic & Scholarly Work' },

  // Friendship Circle (6)
  { id: '3b', title: 'Friendship Circle Recruitment Presentation - Draft Enrollment Concept', filename: '3b.pdf', type: 'pdf', category: 'Friendship Circle' },
  { id: '3c', title: 'Friendship Circle Disabilities Sensitivity Training and Anti-Bullying Workshop Proposal', filename: '3c.pdf', type: 'pdf', category: 'Friendship Circle' },
  { id: '3d', title: 'Friendship Circle Sensitivity Training - Consulting Contract and Program Design', filename: '3d.pdf', type: 'pdf', category: 'Friendship Circle' },
  { id: '3e', title: 'Friendship Circle Email Correspondence - Shemtov, Grossbaum, and Orloff', filename: '3e.pdf', type: 'pdf', category: 'Friendship Circle' },
  { id: '3f', title: 'Letter from the Rebbe on the Care and Education of Jewish Children with Disabilities', filename: '3f.pdf', type: 'pdf', category: 'Friendship Circle' },
  { id: '16a', title: 'The Inward Bound Institute Proposal - "Touching Reality" Series (Fragment)', filename: '16a.pdf', type: 'pdf', category: 'Friendship Circle' },

  // Business & Intellectual Property (7)
  { id: '6a', title: 'Patent Application: Experiential Learning System and Process for Developing Functional Self-Awareness', filename: '6a.pdf', type: 'pdf', category: 'Business & Intellectual Property' },
  { id: '6b', title: 'USPTO Trademark Office Action: "Life Solutions Through Disruptive Learning Technology"', filename: '6b.pdf', type: 'pdf', category: 'Business & Intellectual Property' },
  { id: '6c', title: 'ETP Discovery and Change (Personal Responsibility Training) - Complete Curriculum', filename: '6c.pdf', type: 'pdf', category: 'Business & Intellectual Property' },
  { id: '9e', title: 'DeepSee App - Mindfulness Application Proposal and Patent Research', filename: '9e.pdf', type: 'pdf', category: 'Business & Intellectual Property' },
  { id: '14', title: 'Book Outline - Radical Love: Awakened Relationships and Natural Leadership', filename: '14.pdf', type: 'pdf', category: 'Business & Intellectual Property' },
  { id: '26', title: 'Educational Discoveries - Press, Conference & Case Study Materials', filename: '26.pdf', type: 'pdf', category: 'Business & Intellectual Property' },
  { id: '27b', title: 'Educational Discoveries - Program Descriptions & Marketing Materials', filename: '27b.pdf', type: 'pdf', category: 'Business & Intellectual Property' },
]

export function getDocumentById(id: string): SoftaDocument | undefined {
  return documents.find((doc) => doc.id === id)
}

const categories: { name: string; description: string; color: string }[] = [
  {
    name: 'Writings, Speeches & Correspondence',
    description: "Letters, speeches, interviews, and personal writings from 1975 onward. Correspondence with W. Edwards Deming, a convocation speech at Burlington College, presentation notes, and more. The moments between the programs, where Judith's voice comes through on its own.",
    color: '#E6908A',
  },
  {
    name: 'Transformation Programs',
    description: "Materials from the Emotional Technology Process, Judith's signature multi-session program. Participants worked through structured exercises in self-awareness and emotional literacy, examining the patterns and conditioning that shape everyday life. The goal was lasting change, not a quick fix.",
    color: '#C8BE6E',
  },
  {
    name: 'Choices & Personal Development',
    description: 'Program materials from shorter-format offerings designed to make the deeper transformation work accessible. Weekend retreats, evening sessions, and standalone workshops that gave people practical tools to recognize old patterns and start making more conscious choices.',
    color: '#EDBBCC',
  },
  {
    name: 'Radical Love & Radical Choices',
    description: "Materials from Judith's later work under the Radical Love Foundation. Programs on mindful living, leadership recovery, and awakened relationships that brought decades of teaching into sharper focus. The central idea: real change starts with how we treat ourselves.",
    color: '#D48D78',
  },
  {
    name: 'Corporate Leadership Training & Educational Discoveries',
    description: "Training materials from Educational Discoveries, which brought Judith's approach into organizations like Bank of America, Cargill, Midas International, and Mobil. Programs that treated emotional awareness as a core business skill, not an afterthought.",
    color: '#6DA0C4',
  },
  {
    name: 'Academic & Scholarly Work',
    description: 'Research and scholarly writing spanning decades, from Kabbalistic philosophy and Montessori education to consciousness studies and a doctoral application at Fielding Graduate University. All of it circling the relationship between awareness, learning, and personal transformation.',
    color: '#E6908A',
  },
  {
    name: 'Friendship Circle',
    description: 'Curriculum developed for the Friendship Circle, a Jewish educational program that brings young people together with those who have special needs. Teaching materials built around compassion, presence, and genuine connection.',
    color: '#C8BE6E',
  },
  {
    name: 'Business & Intellectual Property',
    description: 'The operational and commercial side of the work. Patent filings, book proposals, case studies, press coverage, and pitch materials from Educational Discoveries and later ventures. The mission stayed the same. The formats kept evolving.',
    color: '#EDBBCC',
  },
]

export function getCategories(): { name: string; description: string; color: string }[] {
  return categories.filter((cat) =>
    documents.some((doc) => doc.category === cat.name)
  )
}

export function getDocumentsByCategory(category: string): SoftaDocument[] {
  return documents.filter((doc) => doc.category === category)
}

export function getThumbnailPath(doc: SoftaDocument): string {
  if (doc.type === 'image') {
    return `/documents/${doc.filename}`
  }
  const name = doc.filename.replace(/\.pdf$/i, '')
  return `/thumbnails/${name}.png`
}
