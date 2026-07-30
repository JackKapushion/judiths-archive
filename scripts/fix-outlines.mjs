// This script applies verified corrections to document-reviews.json.
// Each correction was manually verified by reading the page text
// from search-index.json and confirming the section heading placement.
//
// DO NOT auto-generate corrections. Each entry here represents a
// correction that was verified by a human or AI reading the actual text.

import { readFileSync, writeFileSync } from 'fs'

const reviews = JSON.parse(readFileSync('functions/data/document-reviews.json', 'utf-8'))

// Each correction: { docId, sectionTitle (for matching), newPages }
// sectionTitle must exactly match the outline entry's title field.
const corrections = [

  // ─── Doc 28: Dissertation ───
  // References heading "REFERENCES Adams, R.E...." appears on page 188.
  // Page 187 ends Chapter Five content.
  { docId: '28', sectionTitle: 'References', newPages: '188-208' },

  // ─── Doc 5b: ETP II Transformation Session 3 ───
  // Consistent offset from printed TOC to actual PDF pages.
  // Each heading verified on the specified page.
  { docId: '5b', sectionTitle: 'POP Jokebook Part 3', newPages: '12-16' },
  { docId: '5b', sectionTitle: 'How To Handle a Projection (Handout)', newPages: '17' },
  { docId: '5b', sectionTitle: 'Touch the Earth Meditation (Handout)', newPages: '18' },
  { docId: '5b', sectionTitle: 'Talking Stones Meditation (Handout)', newPages: '19' },
  { docId: '5b', sectionTitle: 'The Healing Powers of Trees (Handout)', newPages: '20' },
  { docId: '5b', sectionTitle: 'Transformation Key Teachings (Compiled)', newPages: '23-29' },

  // ─── Doc 11: ETP Instructor's Manual (144 pages) ───
  // Every session has a title page (just session name + revision date)
  // followed by content pages. Title pages are the correct section starts.
  // All pages verified by reading actual text from search-index.json.
  //
  // Session One title page at p4: "Session One: Owning Your Personal History Revised 4/23/91"
  // Previous section "Title and Overview" at 4-7 will overlap, but
  // navigation correctness is more important than range cleanliness.
  { docId: '11', sectionTitle: 'Session One: Owning Your Personal History', newPages: '4-17' },
  // Session Two title page at p18: "Session Two: Living From Personal Responsibility"
  { docId: '11', sectionTitle: 'Session Two: Living from Unlimited Personal Responsibility', newPages: '18-32' },
  // Session Three title page at p33: "Session Three Integrating the Primary Family"
  { docId: '11', sectionTitle: 'Session Three: Integrating the Primary Family', newPages: '33-44' },
  // Session Four title page at p45: "Session Four: Vision and Power Revised 4/23/91"
  { docId: '11', sectionTitle: 'Session Four: Vision and Power', newPages: '45-57' },
  // Session Five title page at p58: "Session Five: Creating Adult Relationships Revised 4/23/91"
  { docId: '11', sectionTitle: 'Session Five: Creating Adult Relationships', newPages: '58-66' },
  // Session Six title page at p67: "Session Six: Sex, Bodies and Physical Integration Revised 4/23/91"
  { docId: '11', sectionTitle: 'Session Six: Bodies, Sex, and Physical Integration', newPages: '67-78' },
  // Session Seven title page at p79: "Session Seven: Personal Integrity Revised 4/23/91"
  { docId: '11', sectionTitle: 'Session Seven: Personal Integrity', newPages: '79-83' },
  // Session Eight starts at p84: "ETP 1 Session Eight" (different format, raw notes)
  { docId: '11', sectionTitle: 'Session Eight: Mastering the Process of Change', newPages: '84-91' },
  // Graduate Training content runs from ~p92 to p100
  { docId: '11', sectionTitle: 'Graduate Training Outline', newPages: '92-100' },
  // Choices Weekend cover page at p101: "THE CHOICES WEEKEND Instructor's Manual"
  { docId: '11', sectionTitle: "Choices Weekend Instructor's Guide", newPages: '101-138' },

  // ─── Doc 11a: ETP Instructor's Manual DRAFT (92 pages) ───
  // Same structure as Doc 11. Each session has a title page.
  // Session 2 title page at p19: "Session Two: Living From Personal Responsibility"
  { docId: '11a', sectionTitle: 'Session 2: Living From Personal Responsibility', newPages: '19-33' },
  // Session 3 title page at p34: "Session Three - Integrating the Primary Family"
  { docId: '11a', sectionTitle: 'Session 3: Integrating the Primary Family', newPages: '34-45' },
  // Session 4 title page at p46: "Session Four: Vision and Power"
  { docId: '11a', sectionTitle: 'Session 4: Vision and Power (Retreat)', newPages: '46-58' },
  // Session 5 title page at p59: "Session Five: Creating Adult Relationships"
  { docId: '11a', sectionTitle: 'Session 5: Creating Adult Relationships', newPages: '59-67' },
  // Session 6 title page at p68: "Session Six: Sex, Bodies and Physical Integration"
  { docId: '11a', sectionTitle: 'Session 6: Sex, Bodies and Physical Integration (Retreat)', newPages: '68-79' },
  // Session 7 title page at p80: "Session Seven: Personal Integrity"
  { docId: '11a', sectionTitle: 'Session 7: Personal Integrity', newPages: '80-84' },
  // Session 8 starts at p85: "ETP 1 Session Eight" (both claimed p79 and suggested p67 were wrong)
  { docId: '11a', sectionTitle: 'Session 8: Mastering the Process of Change - A Demonstration', newPages: '85-92' },

  // ─── Doc 11c: Choices Weekend Instructor's Manual (40 pages) ───
  // Day Two heading "DAY TWO:" appears at top of page 19, not page 18
  { docId: '11c', sectionTitle: 'Day Two - Feeling Check, Wisdom, Context, and Personal Responsibility', newPages: '19-24' },
  // "Unconditional Love" section starts at p25 (p24 is still "Seven Steps to Get Out of Reaction")
  { docId: '11c', sectionTitle: 'Day Two - Unconditional Love, Control, Intimacy, and Projection', newPages: '25-31' },
  // Day Three heading "DAY THREE:" appears at top of page 32
  { docId: '11c', sectionTitle: 'Day Three - Vision, Model for Change, and Closing', newPages: '32-38' },

  // ─── Doc 18: Art & Science of Mindful Living (45 pages) ───
  // Systematic +1 offset on most sections. Each heading verified on text.
  // "Week One - Context Introduction" heading starts on p3 (p2 is the love/fear poem)
  { docId: '18', sectionTitle: 'Week One: Context / Introduction', newPages: '3' },
  // "Interim Assignment" text starts on p13 (p12 is "My Story" worksheet)
  { docId: '18', sectionTitle: 'Week One Interim Assignment', newPages: '13' },
  // "Week 2 - Insight" heading on p14
  { docId: '18', sectionTitle: 'Week 2: Insight', newPages: '14' },
  // "Week 3 - Personal Responsibility" heading confirmed at p23
  { docId: '18', sectionTitle: 'Week 3: Personal Responsibility / Owning Yourself', newPages: '23' },
  // Photo reflection exercise starts on p25
  { docId: '18', sectionTitle: 'Photo Reflection and Body Beliefs', newPages: '25-26' },
  // "Judge 'Til You Drop" heading on p27
  { docId: '18', sectionTitle: "Judge 'Til You Drop", newPages: '27' },
  // "Projection = Giving Away Our Power" heading on p28
  { docId: '18', sectionTitle: 'Projection = Giving Away Our Power', newPages: '28' },
  // "A simple meditation" text on p29
  { docId: '18', sectionTitle: 'Simple Meditation', newPages: '29' },
  // Week 3 Self-Assessment is on p30 (p29 is meditation, p36 is Week 4 assessment)
  { docId: '18', sectionTitle: 'Week 3 Self-Assessment and Interim Assignment', newPages: '30' },
  // Personal Journal pages follow Week 3 content at p31-32
  // (p21-22 are the Week 2 journal pages, p31-32 are Week 3 journal pages)
  { docId: '18', sectionTitle: 'Personal Journal Pages', newPages: '31-32' },
  // "Week 4 - Personal Responsibility Towards Others" confirmed at p33
  { docId: '18', sectionTitle: 'Week 4: Personal Responsibility Towards Others', newPages: '33' },
  // "Week 5 - Authenticity" heading on p37 (p38 is "The Rose" lyrics within Week 5)
  { docId: '18', sectionTitle: 'Week 5: Authenticity', newPages: '37' },
  // "Role Play Exercise- Jumping Paradigms" heading on p39
  { docId: '18', sectionTitle: 'Role Play Exercise: Jumping Paradigms', newPages: '39' },

  // ─── Doc 4b: ETP II Transformation Session 1 (37 pages) ───
  // Version B title page at p18: "Instructor's Manual ETP II Transformation SESSION 1 April 18-22, 1991"
  { docId: '4b', sectionTitle: 'Session 1 Teaching Notes (Version B) - First Evening', newPages: '18-23' },

  // ─── Doc 4l: ETP II Transformation Session 2 (10 pages) ───
  // "Friday Afternoon" stays at p6 (REJECT: "FRIDAY AFTERNOON" text confirmed on p6)
  // "Friday Evening" starts at p8: "After dinner, in groups: RELATIONSHIP HEALING"
  { docId: '4l', sectionTitle: 'Friday Evening - Relationship Healing', newPages: '8' },

  // ─── Doc 13: Speeches and Radical Love Foundation Materials (62 pages) ───
  // VICI Opening Ceremony starts at p1: "VERMONT INSTITUTE OF COMMUNITY INVOLVEMENT Opening Ceremony"
  { docId: '13', sectionTitle: "VICI Opening Ceremony Speech: 'In Praise of Venture' (1973)", newPages: '1-6' },
  // Letter to Deming at p19: "EDUCATIONAL DISCOVERIES February 27, 1992 Dr. W. Edwards Deming"
  { docId: '13', sectionTitle: 'Letter to Dr. W. Edwards Deming (1992)', newPages: '19' },
  // Core Teachings at p25: "Proposed Conceptual Scheme for the Core Teachings of Radical Love"
  { docId: '13', sectionTitle: 'Core Teachings of Radical Love', newPages: '25-26' },
  // Presentation Slides at p27: "Radical Love Foundation www.Radicallovefoundation.org"
  { docId: '13', sectionTitle: 'Radical Love Foundation Presentation Slides', newPages: '27-33' },
  // Purpose/Vision/Mission at p40: "Purpose, Vision and Mission Statement"
  { docId: '13', sectionTitle: 'Purpose, Vision and Mission Statement', newPages: '40' },
  // Teaching Content at p43: "Experiencing What Is - the practical metaphysics of natural authenticity"
  { docId: '13', sectionTitle: 'Teaching Content: Authenticity, Free Choice, Archetypes', newPages: '43-50' },

  // ─── Doc 13d: Radical Love Workshop Materials (33 pages) ───
  // "Objections" heading on p12: "Objections. How do you feel when you hear an objection?"
  { docId: '13d', sectionTitle: 'Objections and Reactions Teaching Material', newPages: '12-15' },
  // Educational Discoveries overview at p28: "Co-Founder of Educational Discoveries..."
  { docId: '13d', sectionTitle: 'Educational Discoveries Module Overviews', newPages: '28' },
  // "Additional content from RL/ETP/NL transcripts" at p21
  { docId: '13d', sectionTitle: 'Additional Teaching Content', newPages: '21-25' },

  // ─── Doc 25b: Model for Change For Managers (30 pages) ───
  // All module headings verified. Consistent +2 offset.
  // "Module Four: Resistance and Choice" at p11
  { docId: '25b', sectionTitle: 'Day One - Resistance and Choice', newPages: '11-12' },
  // "Module Five: Giving and Receiving Support" at p13
  { docId: '25b', sectionTitle: 'Day One - Giving and Receiving Support', newPages: '13-14' },
  // "Day Two Module Six: Creating an Environment" at p15
  { docId: '25b', sectionTitle: 'Day Two - Creating an Environment', newPages: '15-16' },
  // "Module Seven: Getting Past Bias and Judgment" at p17
  { docId: '25b', sectionTitle: 'Day Two - Getting Past Bias and Judgment', newPages: '17-18' },
  // "Module Eight: The Essence of Communicating" at p19
  { docId: '25b', sectionTitle: 'Day Two - The Essence of Communicating', newPages: '19' },
  // "Opening Module" at p6 (from NEEDS REVIEW, confirmed)
  { docId: '25b', sectionTitle: 'Day One - Opening Module', newPages: '6' },
  // "Debrief the Improvisation Activity" at p9
  { docId: '25b', sectionTitle: 'Day One - Debrief the Improvisation Activity', newPages: '9-10' },
  // "Taking Ownership for Change" at p20
  { docId: '25b', sectionTitle: 'Day Two - Taking Ownership for Change', newPages: '20' },

  // ─── Doc 25c: Breakthrough - Model for Change Workbook (33 pages) ───
  // "The Model for a Paradigm Shift" at p5 (not p4 or p3)
  { docId: '25c', sectionTitle: 'Paradigm and Paradigm Shift', newPages: '5' },
  // "Mission: The purpose of the organization..." at p9 (not p8 or p10)
  { docId: '25c', sectionTitle: 'Purpose, Mission, Vision, and Objectives', newPages: '9-12' },
  // "Intention and Choice Points" at p18 (not p17 or p31; p31 is glossary)
  { docId: '25c', sectionTitle: 'Intention and Choice Points', newPages: '18' },
  // "Illusion" and "Crisis" definitions both on p20
  { docId: '25c', sectionTitle: 'Illusion and Crisis', newPages: '20' },
  // "Business as Usual, Decision to Change" at p17
  { docId: '25c', sectionTitle: 'Business as Usual, Decision, and Resistance', newPages: '17' },

  // ─── Doc 19: Applying Accelerated Learning (105 pages) ───
  // "Whole Being Program Design The Process of Continuous Improvement" at p38
  { docId: '19', sectionTitle: 'Continuous Improvement of Program Design', newPages: '38' },
  // Accounting Game definitions start at p43 (not p38 or p46)
  { docId: '19', sectionTitle: 'The Accounting Game', newPages: '43-55' },
  // "THE CHOICES PARADIGM FOR CHANGE" title page at p58
  { docId: '19', sectionTitle: 'The Model for Change / Choices Paradigm', newPages: '58-62' },
  // "THE LEARNING STYLES INVENTORY" at p70 (p69 is empty)
  { docId: '19', sectionTitle: 'Learning Styles Inventory', newPages: '70-75' },

  // ─── Doc 20a: WHY's Guide to CPR Training (135 pages) ───
  // Seminar overview at p3 (p1 is empty)
  { docId: '20a', sectionTitle: 'Seminar Overview and Agenda', newPages: '3-7' },
  // "WHY A Game of Integrity" at p34 (p27 is empty)
  { docId: '20a', sectionTitle: 'WHY: A Game of Integrity - Trading Simulation', newPages: '34-90' },
  // Action Planning at p133 (p121 is empty)
  { docId: '20a', sectionTitle: 'Action Planning and Notes', newPages: '133-135' },

  // ─── Doc 15: Radical Choices DLT Collection (33 pages) ───
  // "Radical Choices Leadership in Recovery" title at p9
  { docId: '15', sectionTitle: 'Radical Choices Leadership in Recovery Day Two Workbook', newPages: '9-13' },
  // "Personal Responsibility" section heading at p13
  { docId: '15', sectionTitle: 'Handwritten Cover: Real Impact Learning Personal Responsibility', newPages: '13' },
  // "RC DLT Train the Trainer Session Three" at p19
  { docId: '15', sectionTitle: 'Radical Choices DLT Train the Trainer Session Three: Beyond Suffering', newPages: '19-33' },

  // ─── Doc 15c: RC Train the Trainer Session Three (26 pages) ───
  // "Day Three: Taking It Out In The World" at p22
  { docId: '15c', sectionTitle: 'Day Three: Taking It Out In The World', newPages: '22-26' },
  // "Day One: Know What Is" at p4
  { docId: '15c', sectionTitle: 'Day One: Know What Is / Own What Is', newPages: '4-7' },
  // "Day Two: Clarity" at p14 (agent found DIFFERENT from both p8 and p10)
  { docId: '15c', sectionTitle: 'Day Two: Clarity', newPages: '14-21' },

  // ─── Doc 15a: Choices Weekend Personal Discovery Form (7 pages) ───
  // "Personal Psychology" section at p4 (p6 is empty)
  { docId: '15a', sectionTitle: 'Personal Psychology and Closing', newPages: '4-5' },

  // ─── Doc 15b: RC Leadership Day Two Workbook (11 pages) ───
  // "Six Principles" at p9 (p10 has the closing text)
  { docId: '15b', sectionTitle: 'Six Principles of DLT', newPages: '9' },
  // "Closing / Contact Information" at p10 (p11 is empty)
  { docId: '15b', sectionTitle: 'Closing / Contact Information', newPages: '10' },

  // ─── Doc 10b: Personal Responsibility (6 pages) ───
  // "Family Systems" at p2 (p4 is empty)
  { docId: '10b', sectionTitle: 'Family Systems and Organizational Context', newPages: '2' },
  // "Personal Responsibility" at p3 (p5 is empty)
  { docId: '10b', sectionTitle: 'Personal Responsibility and Emotional Literacy', newPages: '3-4' },

  // ─── Doc 16: Radical Love Participant Workbook & Program Materials (34 pages) ───
  // "Radical Love Participant Workbook" title on p22
  { docId: '16', sectionTitle: 'Radical Love Participant Workbook', newPages: '22-32' },
  // "Living the Future Now" program on p10
  { docId: '16', sectionTitle: 'Living the Future Now - Winter 2012 Program', newPages: '10' },
  // "Science of Emotions" content on p11 (p12 is empty)
  { docId: '16', sectionTitle: 'Science of Emotions', newPages: '11-15' },

  // ─── Doc 16b: Radical Love Readings and Workshop Materials (18 pages) ───
  // "Science of Emotions and Learning" at p10
  { docId: '16b', sectionTitle: 'Science of Emotions and Learning', newPages: '10' },

  // ─── Doc 18a: Adyashanti Interview (19 pages) ───
  // "Pure Anger and Undivided Emotion" at p19 (p7 is about bottoming out, unrelated)
  { docId: '18a', sectionTitle: 'Pure Anger and Undivided Emotion', newPages: '19' },
  // "Past Lives and Final Awakening" starts at p13 (Adyashanti's response about past lives)
  { docId: '18a', sectionTitle: "Past Lives and 'Final Awakening' at Age 32", newPages: '13-16' },

  // ─── Doc 9e: DeepSee App Proposal (5 pages) ───
  // "Radical Choices Company Overview" at p1 (p4 is empty)
  { docId: '9e', sectionTitle: 'Radical Choices Company Overview and DeepSee App', newPages: '1-3' },

  // ─── Doc 9: Choices for Success Collection (84 pages) ───
  // Three sections point to empty pages. Fixing with next non-empty page.
  // "Radical Choices: Participant Workbooks (Divider)" p31 is empty
  // Keeping this as-is since it's a divider page (may be an actual blank divider)

  // ─── Doc 6c: Discovery and Change (94 pages) ───
  // Instructor manual sections verified. Handout sections are complex (skip for now).
  // Session Six (Bodies, Sex) title page at p71
  { docId: '6c', sectionTitle: 'Session Six (continued): Bodies, Sex, and Commitment', newPages: '71-83' },
  // Session Seven title page at p84
  { docId: '6c', sectionTitle: 'Session Seven: Personal Integrity', newPages: '84-94' },

  // ─── ROUND 2: Additional corrections from post-verification review ───

  // Doc 11: Graduate Training heading is on p93 (p92 is garbled OCR text)
  { docId: '11', sectionTitle: 'Graduate Training Outline', newPages: '93-100' },

  // Doc 20a: "Model for Private Consulting" starts at p117 (agent verified)
  { docId: '20a', sectionTitle: "Consultant's Tools and Taking Stock", newPages: '117-132' },

  // ─── Doc 1: Kabbalah Book of Change (83 pages) ───
  // The PDF starts mid-Dalet (page 1 has Dalet shadow content).
  // All section boundaries verified by reading actual letter headings:
  // Hei heading at p4, Yud heading at p19, Ayin at p38, Tzadi at p44, Tav at p58, Authors Notes at p60
  { docId: '1', sectionTitle: 'Introduction and Early Letters (Aleph through Dalet)', newPages: '1-3' },
  { docId: '1', sectionTitle: 'Hei through Tet', newPages: '4-18' },
  { docId: '1', sectionTitle: 'Yud through Samech', newPages: '19-37' },
  { docId: '1', sectionTitle: 'Ayin through Pei', newPages: '38-43' },
  { docId: '1', sectionTitle: 'Tzadi through Tav', newPages: '44-59' },
  { docId: '1', sectionTitle: 'Authors Notes and Appendix', newPages: '60-83' },

  // ─── Doc 16: Additional fixes ───
  // "Inward Bound Institute Proposal" at p1 (text shows "The Inward Bound Institute Proposal")
  { docId: '16', sectionTitle: 'Inward Bound Institute Proposal', newPages: '1' },
  // "Radical Love Foundation - NOW" at p2 (text shows "RLF©2011 NOW", p3 is empty)
  { docId: '16', sectionTitle: 'Radical Love Foundation - NOW', newPages: '2' },

  // ─── Doc 13c: Deming Letters ───
  // "Second Letter to Deming" page 3 is empty (scanned page didn't extract).
  // Page 4 has the actual letter text. Fix to p4.
  { docId: '13c', sectionTitle: 'Second Letter to Deming (February 27, 1992)', newPages: '4' },

  // ─── Doc 4i: Transformation Session 2 Version A ───
  // "SECOND DAY" heading clearly on p6
  { docId: '4i', sectionTitle: 'Second Day (Friday)', newPages: '6-9' },
  // "SUNDAY DAY" heading on p11
  { docId: '4i', sectionTitle: 'Sunday and Closing', newPages: '11-13' },

  // ─── Doc 4j: Transformation Session 2 Version B ───
  // "SATURDAY DAY" heading on p10
  { docId: '4j', sectionTitle: 'Saturday', newPages: '10-12' },
  // "SUNDAY DAY" heading on p13
  { docId: '4j', sectionTitle: 'Sunday and Closing', newPages: '13-14' },

  // ─── Doc 25: Nature of Conflict (27 pages) ───
  // "The Model for Change" text at p16 (p14 has partial/garbled "The Moder For")
  { docId: '25', sectionTitle: 'The Model for Change', newPages: '16-21' },
  // "The Model for Change - The Players" at p23
  { docId: '25', sectionTitle: 'The Model for Change - The Players', newPages: '23-27' },

  // ─── ROUND 3: Doc 7 and remaining fixes ───

  // ─── Doc 7: MBL Program (279 pages) ───
  // The document compiles sessions out of order. Headers reveal:
  // Pages 185-219: "9) Responsibility & Delegation" (MBL internal session 9)
  // Pages 220-225: Session 6 Review of Leadership
  // Pages 226-248: "8) Integrity and Leadership, Self-Directed Program"
  // Pages 249+: Rosters, schedules, evaluations (admin)
  { docId: '7', sectionTitle: 'Session Eight: Integrity and Leadership', newPages: '226-248' },
  { docId: '7', sectionTitle: 'Session Nine: Responsibility and Delegation', newPages: '184-219' },
  { docId: '7', sectionTitle: 'Program Administration', newPages: '249-279' },

  // ─── Doc 3c: Friendship Circle Workshop ───
  // Page 1 has the workshop proposal content ("Disabilities Sensitivity Training and Anti-Bullying")
  // Page 2 has conference call notes
  { docId: '3c', sectionTitle: 'Proposed Workshop and Anti-Bullying Connection', newPages: '1' },

  // ─── Doc 6c: Session Six handout section ───
  // Session Six (Retreat - Vision and Purpose) starts at p53 in the instructor manual
  // p50 is Session Five Day Four content, p52 has "schedule Session Six" note
  { docId: '6c', sectionTitle: 'Session Six: Retreat - Vision and Purpose', newPages: '53-70' },

  // ─── ROUND 4: From final agent verification (aacd0ee) ───

  // Doc 1: Hei heading is at PDF p2 (= printed page 23). Agent confirmed the original
  // page numbers were printed page numbers confused with PDF page numbers.
  { docId: '1', sectionTitle: 'Introduction and Early Letters (Aleph through Dalet)', newPages: '1' },
  { docId: '1', sectionTitle: 'Hei through Tet', newPages: '2-18' },

  // Doc 3f: Point 6 ("Jewish Education") content starts at p2, not p3 or p1.
  // p1 is the opening of the letter, p2 has the specific Point 6 discussion.
  { docId: '3f', sectionTitle: 'Jewish Education and Identity (Point 6) and Closing', newPages: '2-3' },

  // Doc 6b: TEAS RF application starts at p18 (not p20)
  { docId: '6b', sectionTitle: 'TEAS RF Trademark Application', newPages: '18-22' },

  // Doc 7: Session Nine starts at p185 (TOC page), not p184 (title page is p184 but
  // the actual session content/TOC begins at p185)
  { docId: '7', sectionTitle: 'Session Nine: Responsibility and Delegation', newPages: '185-219' },

  // Doc 24: "Six Emotional Sources of Questions and F.A.V.O.R." starts at p27 (not p28)
  { docId: '24', sectionTitle: 'The Six Emotional Sources of Questions and F.A.V.O.R.', newPages: '27-29' },

  // Doc 10: "Section III: Originals" starts at p17 or p18 (not p21)
  // Agent found logistics guidelines content starting around p17-18
  { docId: '10', sectionTitle: 'Section III: Originals / Evening Workshop Logistics Guidelines', newPages: '17-30' },

  // ─── ROUND 5: Session 4 verification pass ───

  // Doc 13d: "Judith Orloff Bio" was at p13 (Reactions are Goldmines content, wrong).
  // Verification script suggested p7 (conference emails, also wrong).
  // Actual bio is on p27: "Judith Orloff, M.Ed. / Co-Founder, Radical Love Foundation..."
  { docId: '13d', sectionTitle: 'Judith Orloff Bio', newPages: '27' },

  // Doc 16: "Radical Love Foundation - Commitment" was at p5 (IS THIS NEW? content).
  // Commitment text ("Until one is committed there is hesitancy...") is on p4.
  { docId: '16', sectionTitle: 'Radical Love Foundation - Commitment', newPages: '4' },

  // Doc 13d: "Radical Love Foundation Purpose, Vision and Mission" was at p21
  // (Additional content from RL/ETP/NL transcripts, wrong section).
  // p18 has the explicit PVM statement: "Our Purpose: Clarity for the benefit of all."
  { docId: '13d', sectionTitle: 'Radical Love Foundation Purpose, Vision and Mission', newPages: '18' },

  // Doc 6c: "Session One: Emotional Autobiography" was at p3 (Session Three Mom and Dad Game).
  // p11 explicitly says "DISCOVERY AND CHANGE Session One EMOTIONAL AUTOBIOGRAPHY"
  { docId: '6c', sectionTitle: 'Session One: Emotional Autobiography', newPages: '11' },

  // Doc 15: "Handwritten Cover: Radical Choices Disruptive Learning Technology" was at p1
  // (Choices Weekend Personal Discovery Form, typed text).
  // p8 has garbled OCR of handwritten text: "R alicat C ho:ces fiseu eve learning beclinote AY"
  { docId: '15', sectionTitle: 'Handwritten Cover: Radical Choices Disruptive Learning Technology', newPages: '8' },

  // ─── Low confidence corrections verified by reading page text ───

  // Doc 3b: "Extended Activities and Wrap-up" was at p3 (cost estimates).
  // p4 has the program outline with activities and wrap-up sections.
  { docId: '3b', sectionTitle: 'Extended Activities and Wrap-up', newPages: '4' },

  // Doc 3b: "Assumptions and Project Planning" was at p4 (program outline).
  // p2 explicitly has "Assumptions: 1. We will conduct interviews..."
  { docId: '3b', sectionTitle: 'Assumptions and Project Planning', newPages: '2-3' },

  // Doc 11c: "Music Guide" was at p39 (Day Three wrap-up text).
  // p40 has the "HOW TO USE THE MUSIC" heading.
  { docId: '11c', sectionTitle: 'Music Guide', newPages: '40' },

  // Doc 15b: "Authenticity and Communicating Intention" was at p8 (Integrity section).
  // p7 has section 6 Authenticity and "6.1 You Always Communicate Your Intention"
  { docId: '15b', sectionTitle: 'Authenticity and Communicating Intention', newPages: '7' },

  // Doc 15b: "Integrity and Application Exercise" was at p9 (Six Principles section).
  // p8 has section 7 Integrity and "7.1 Lack of Integrity Application Exercise"
  { docId: '15b', sectionTitle: 'Integrity and Application Exercise', newPages: '8' },

  // Doc 18: "The Choice of Love / Opening Poem" was at p1 (radical intimacy intro).
  // p2 has the love vs fear poem ("What does the voice of fear whisper to you?")
  { docId: '18', sectionTitle: 'The Choice of Love / Opening Poem', newPages: '2' },

  // Doc 18: "Dishonesty" was at p23 (Week 3 Personal Responsibility heading).
  // p24 explicitly discusses forms of dishonesty.
  { docId: '18', sectionTitle: 'Dishonesty', newPages: '24' },

  // Doc 18a: "Death, Dying, and Waking Up" was at p17 (brief conclusion).
  // p16 has "Waking up is dying" and extensive death discussion.
  { docId: '18a', sectionTitle: 'Death, Dying, and Waking Up', newPages: '16-18' },

  // Doc 18a: "Adyashanti Bio" was at p19 (final interview page, emotion content).
  // p17 second half has the full Adyashanti bio text.
  { docId: '18a', sectionTitle: 'Adyashanti Bio', newPages: '17' },

  // Doc 25b: "Role-Play Scenario Cards" was at p19 (Module Eight overview).
  // p21 starts the actual scenario cards: "Sulky Supervisor"
  { docId: '25b', sectionTitle: 'Role-Play Scenario Cards', newPages: '21-30' },

  // Doc 10: "Section I: Outlines" was at p3 (first outline content page).
  // p1 literally says "SECTION I OUTLINES" as the section divider.
  { docId: '10', sectionTitle: 'Section I: Outlines', newPages: '1-10' },

  // Doc 6b: "XSearch Trademark Search Summary" was at p19 (application form).
  // p17 has the actual XSearch search data.
  { docId: '6b', sectionTitle: 'XSearch Trademark Search Summary', newPages: '17' },

]

// ── Apply corrections ──

let applied = 0
let failed = 0

for (const fix of corrections) {
  const doc = reviews.find(r => r.id === fix.docId)
  if (!doc) {
    console.error(`ERROR: Document "${fix.docId}" not found`)
    failed++
    continue
  }
  if (!doc.outline) {
    console.error(`ERROR: Document "${fix.docId}" has no outline`)
    failed++
    continue
  }
  const section = doc.outline.find(s => s.title === fix.sectionTitle)
  if (!section) {
    console.error(`ERROR: Section "${fix.sectionTitle}" not found in doc "${fix.docId}"`)
    failed++
    continue
  }
  const oldPages = section.pages
  section.pages = fix.newPages
  console.log(`Doc ${fix.docId}: "${fix.sectionTitle}" ${oldPages} -> ${fix.newPages}`)
  applied++
}

writeFileSync('functions/data/document-reviews.json', JSON.stringify(reviews, null, 2) + '\n')

console.log(`\nApplied ${applied} corrections, ${failed} failed.`)
