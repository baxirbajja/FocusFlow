import { 
  PriorityLevel, 
  Task, 
  YouTubeVideo,
  SubjectStudyPlan,
  SubjectStudyPart,
  StudyConcept,
  StudyConceptVideo,
  SubjectMilestoneTP,
  TPAttachment,
  ClassIntelNotice,
  CoursePlanAuditResult,
  AuditPartEnhancement,
  AuditNewPartSuggestion,
  AuditConceptDraft,
  AuditReorderSuggestion,
  TPExecutionGuide,
  TPExerciseGuide,
  TPMachineStep,
  TPQuestionAnswer,
  TPScreenshotItem
} from '../types';

export interface AIConcept {
  id: string;
  conceptName: string;
  whyNeeded: string;
  youtubeSearchQuery: string;
  videoNote: string;
  matchedVideo?: {
    videoId: string;
    title: string;
    url: string;
    durationMinutes: number;
    channel: string;
    thumbnail: string;
  };
}

export interface AIExtractedTask {
  id: string;
  title: string;
  notes: string;
  plannedDuration: number;
  priority: PriorityLevel;
  selected: boolean;
}

export interface AIDigestResult {
  summary: string;
  tasks: AIExtractedTask[];
  concepts: AIConcept[];
  studyPlan?: SubjectStudyPlan;
}

export interface MultiSessionInput {
  subjectName: string;
  transcripts: Array<{ name: string; content: string }>;
  tpDocuments: Array<{ name: string; content: string }>;
  courseDocuments: Array<{ name: string; content: string }>;
  additionalNotes?: string;
  apiKey?: string;
}

const GEMINI_KEY_STORAGE = 'focusflow_gemini_key';

// Resilient model fallback chain (tested with active 2026 Gemini catalog)
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

export function getSavedGeminiKey(): string {
  if (typeof window !== 'undefined' && window.electronAPI?.getStorage) {
    const key = window.electronAPI.getStorage(GEMINI_KEY_STORAGE);
    if (key) return String(key).trim();
  }
  return localStorage.getItem(GEMINI_KEY_STORAGE)?.trim() || '';
}

export function saveGeminiKey(key: string): void {
  const clean = key.trim();
  if (typeof window !== 'undefined' && window.electronAPI?.setStorage) {
    window.electronAPI.setStorage(GEMINI_KEY_STORAGE, clean);
  }
  localStorage.setItem(GEMINI_KEY_STORAGE, clean);
}

// Resilient Gemini API caller that tries candidate models in sequence
async function callGeminiWithFallback(prompt: string, apiKey: string): Promise<string | null> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
            maxOutputTokens: 16384,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText && rawText.trim()) {
          return rawText;
        }
      } else {
        console.warn(`Gemini model ${model} returned status ${response.status}, trying fallback model...`);
      }
    } catch (err) {
      console.warn(`Gemini model ${model} request failed:`, err);
    }
  }

  return null;
}

// Rich YouTube video search: returns multiple videos (short and long deep-dives)
export async function searchConceptVideoResources(
  query: string,
  limit: number = 4
): Promise<StudyConceptVideo[]> {
  const results: StudyConceptVideo[] = [];

  if (window.electronAPI?.searchYouTube) {
    try {
      const vids = await window.electronAPI.searchYouTube(query);
      if (vids && vids.length > 0) {
        for (const v of vids.slice(0, limit)) {
          results.push({
            videoId: v.videoId,
            title: v.title,
            url: v.url,
            durationMinutes: v.durationMinutes || 20,
            durationText: v.durationText || `${v.durationMinutes || 20}m`,
            channel: v.channel || 'YouTube Tutor',
            thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
          });
        }
        return results;
      }
    } catch (err) {
      console.warn(`YouTube search error for "${query}":`, err);
    }
  }

  // Fallback videos if offline or electron API unavailable
  const fallbackId = 'wThveiL3f3A';
  return [
    {
      videoId: fallbackId,
      title: `${query} - Comprehensive Tutorial & Lab Walkthrough`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      durationMinutes: 30,
      durationText: '30:00',
      channel: 'Academic Tutorial',
      thumbnail: `https://img.youtube.com/vi/${fallbackId}/hqdefault.jpg`,
    },
  ];
}

// Legacy concept video matcher (enhanced to pick the best match)
export async function matchVideosForConcepts(concepts: AIConcept[]): Promise<AIConcept[]> {
  const results: AIConcept[] = [];

  for (const c of concepts) {
    let matchedVideo: AIConcept['matchedVideo'] | undefined = undefined;

    if (window.electronAPI?.searchYouTube) {
      try {
        const videos = await window.electronAPI.searchYouTube(c.youtubeSearchQuery);
        if (videos && videos.length > 0) {
          const goodMatch = videos[0];
          matchedVideo = {
            videoId: goodMatch.videoId,
            title: goodMatch.title,
            url: goodMatch.url,
            durationMinutes: goodMatch.durationMinutes,
            channel: goodMatch.channel,
            thumbnail: goodMatch.thumbnail,
          };
        }
      } catch (err) {
        console.warn(`YouTube search failed for "${c.youtubeSearchQuery}":`, err);
      }
    }

    results.push({
      ...c,
      matchedVideo,
    });
  }

  return results;
}

function findMatchingRawTPContent(
  tpTitle: string,
  tpDocuments: Array<{ name: string; content: string }>
): string | undefined {
  if (tpDocuments.length === 0) return undefined;
  if (tpDocuments.length === 1) {
    return tpDocuments[0].content.trim().slice(0, 30000) || undefined;
  }
  const tokens = tpTitle
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  let best = tpDocuments[0];
  let bestScore = -1;
  for (const doc of tpDocuments) {
    const hay = `${doc.name} ${doc.content.slice(0, 1500)}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = doc;
    }
  }
  return best.content.trim().slice(0, 30000) || undefined;
}

function buildMilestoneTP(
  rawTP: any,
  fallbackNum: number,
  fallbackConceptNames: string[],
  rawContent?: string
): SubjectMilestoneTP {
  return {
    id: 'tp_' + Date.now() + '_' + (rawTP.tpNumber || fallbackNum) + '_' + Math.random().toString(36).substring(2, 5),
    tpNumber: Number(rawTP.tpNumber) || fallbackNum,
    title: rawTP.title || `TP ${fallbackNum} Practical Lab`,
    description: rawTP.description || 'Complete hands-on exercises.',
    requiredConceptNames:
      Array.isArray(rawTP.requiredConceptNames) && rawTP.requiredConceptNames.length > 0
        ? rawTP.requiredConceptNames
        : fallbackConceptNames,
    estimatedMinutes: Number(rawTP.estimatedMinutes) || 90,
    deadline: rawTP.deadline || undefined,
    rawContent: rawContent ? rawContent.trim().slice(0, 30000) : rawTP.rawContent,
    isCompleted: false,
  };
}

function findBestExistingPartForTP(
  tpName: string,
  tpContent: string,
  existingParts: SubjectStudyPart[]
): SubjectStudyPart {
  const tokens = `${tpName} ${tpContent}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  const tokenSet = new Set(tokens);

  let bestPart = existingParts[0];
  let bestScore = -1;

  for (const part of existingParts) {
    const partText = [
      part.title,
      part.description,
      ...part.mustLearnConcepts.map((c) => `${c.name} ${c.summary} ${c.additionalNotes || ''}`),
    ]
      .join(' ')
      .toLowerCase();

    let score = 0;
    for (const word of tokenSet) {
      if (partText.includes(word)) score += 1;
    }
    // Slight preference for parts that don't yet have a TP when scores tie
    const adjustedScore = score * 10 + (part.targetTP ? 0 : 1);
    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestPart = part;
    }
  }

  return bestPart;
}

// Master Gemini Multi-Session & TP Synthesizer:
// Builds an interactive Subject Study Plan structured by Parts, Concepts -> TPs, and Class Intelligence
export async function generateMasterStudyPlan(
  input: MultiSessionInput,
  existingPlan?: SubjectStudyPlan
): Promise<SubjectStudyPlan> {
  const activeKey = input.apiKey?.trim() || getSavedGeminiKey();

  if (!activeKey) {
    return generateFallbackMasterStudyPlan(input, existingPlan);
  }

  // Allow generous context so all sessions, TPs, and course slides are fully ingested
  const combinedTranscripts = input.transcripts
    .map((t, i) => `=== SESSION ${i + 1}: ${t.name} ===\n${t.content}`)
    .join('\n\n')
    .slice(0, 300000);

  const combinedTps = input.tpDocuments
    .map((tp, i) => `=== TP / LAB ASSIGNMENT ${i + 1}: ${tp.name} ===\n${tp.content}`)
    .join('\n\n')
    .slice(0, 200000);

  const combinedCourses = input.courseDocuments
    .map((cd, i) => `=== COURSE FILE ${i + 1}: ${cd.name} ===\n${cd.content}`)
    .join('\n\n')
    .slice(0, 150000);

  const tpCount = input.tpDocuments.length;
  const sessionCount = input.transcripts.length;

  const existingPartsContext = existingPlan
    ? existingPlan.parts
        .map((p) => {
          const conceptList = p.mustLearnConcepts.map((c) => c.name).join('; ');
          const tpNote = p.targetTP ? ` [Already has TP: ${p.targetTP.title}]` : ' [No TP attached yet]';
          return `Part ${p.partNumber}: "${p.title}"${tpNote}\n  Covered Concepts: ${conceptList || 'None'}`;
        })
        .join('\n')
    : '';

  const prompt = `You are a world-class university professor, systems architect, and curriculum designer.
Analyze all provided lecture session transcriptions (${sessionCount} sessions), course files/slides, and practical work assignments (${tpCount} TPs) for "${input.subjectName}".

Synthesize everything into an exhaustive, high-yield academic roadmap structured with strict pedagogical prerequisite ordering.

=== INPUT DATA ===
SUBJECT: ${input.subjectName}

${combinedTranscripts ? `--- CLASS TRANSCRIPTS (${sessionCount} Sessions) ---\n${combinedTranscripts}\n` : ''}
${combinedTps ? `--- TP / LAB DOCUMENTS (${tpCount} Practical Works) ---\n${combinedTps}\n` : ''}
${combinedCourses ? `--- COURSE SYLLABUS / SLIDES ---\n${combinedCourses}\n` : ''}
${input.additionalNotes ? `--- ADDITIONAL STUDENT NOTES ---\n${input.additionalNotes}\n` : ''}

${existingPlan ? `=== EXISTING STUDY PLAN TO EXTEND ===
The student ALREADY has an existing roadmap with ${existingPlan.parts.length} sequential parts:
${existingPartsContext}

Existing Subject Big Picture: ${existingPlan.bigPictureDescription}

CRITICAL EXTEND / APPEND RULES (FOLLOW STRICTLY):
1. DO NOT repeat or recreate existing parts or concepts that are already covered above!
2. PLACE TPs UNDER MATCHING EXISTING PARTS WHEN CONCEPTS ARE ALREADY COVERED:
   - Check the concepts required by any newly provided TP / practical work against the "Covered Concepts" of the existing Parts above.
   - If ALL concepts needed to solve a TP are ALREADY covered in the existing Parts (for example, existing Part 1 & Part 2 already cover the concepts needed for TP 1), DO NOT create a new Part at the end for that TP!
   - Instead, place that TP inside "tpAttachments" with "attachToPartNumber" set to the LAST existing Part number whose concepts are required for that TP (e.g., 2).
3. Only create NEW entries in "parts" (numbered sequentially starting at Part ${existingPlan.parts.length + 1}) when the newly uploaded files introduce genuinely NEW concepts not yet covered in the existing Parts.
4. If the new files ONLY add TPs whose concepts are already covered by the existing Parts, set "parts": [] and put all TPs into "tpAttachments"!
` : ''}

=== STRICT PEDAGOGICAL ARCHITECTURE (YOU MUST FOLLOW THIS EXACTLY) ===

1. BIG PICTURE OF THE SUBJECT (CRUCIAL):
   Write a comprehensive breakdown:
   - What this subject is fundamentally about (mental model).
   - WHY you learn it (the real engineering and computer science problems it solves).
   - HOW IT BENEFITS YOU (crucial: real-world production usage, career impact, and engineering capability).

2. DIVIDE THE COURSE INTO AS MANY PARTS AS NEEDED:
   Divide the course into sequential Parts based on the course syllabus, slides, and sessions (divide according to the course file EVEN IF there is no TP for certain sections).
   
   For EACH Part, provide:
   a. "title": Clear descriptive module title (e.g., "Part 1: Linux Storage Architecture & Block Devices").
   b. "description" (CRUCIAL): The Big Picture of this part — explicitly answering:
      - What is happening under the hood in this part?
      - Why do you learn it?
      - How it benefits you in real life and in engineering practice?
   c. "mustLearnConcepts" (CRUCIAL): Array of 3 to 6 essential prerequisite concepts:
      - "name": Precise technical concept name (e.g. "Physical Extents (PE) & Volume Sizing").
      - "summary": Deep, rigorous technical explanation (3-5 sentences covering mechanics, internal workflows, and exam relevance).
      - "searchQuery": Laser-focused YouTube search query to fetch the best educational tutorial or animation (e.g. "Linux LVM physical volume extent tutorial step by step").
      - "additionalNotes": Exact terminal commands, syntax flags, gotchas, or instructor warnings.
   d. "targetTP" (MILESTONE PRACTICAL WORK):
      - If this Part marks the completion of all prerequisite concepts required to solve a practical work lab (e.g. TP 1, TP 2, TP 3), attach that TP to this Part!
      - If a practical lab requires concepts from multiple preceding parts (e.g. Part 1 and Part 2 are required before TP 1), Part 1 will have "targetTP": null, and Part 2 will culminate in "targetTP": TP 1.
      - If a Part covers theoretical course topics without a TP lab, set "targetTP": null.
      - When a "targetTP" is provided, include:
        * "tpNumber": integer (1, 2, 3...)
        * "title": Full descriptive title of the TP lab
        * "description": Comprehensive breakdown of lab instructions, required tasks, and expected deliverables
        * "requiredConceptNames": Array listing all prerequisite concept names from preceding parts needed to complete this lab
        * "estimatedMinutes": Realistic time required in minutes (e.g. 60, 90, 120, 150)
        * "deadline": Submission deadline if mentioned, else ""

3. CLASS INTELLIGENCE NOTICES ("Things to Give Attention To"):
   Extract specific logistical notices from the newly uploaded files (or [] if none):
   - Category: "deadline", "exam_hint", "teacher_warning", or "setup_requirement".
   - Clear titles and details highlighting explicit professor hints, exam questions, or grading criteria.

Respond ONLY with valid, complete JSON in this structure:
{
  "bigPictureDescription": "...",
  "attentionNotices": [
    {
      "category": "deadline",
      "sessionSource": "Session 2",
      "title": "TP 1 Submission Deadline",
      "details": "..."
    }
  ],${existingPlan ? `
  "tpAttachments": [
    {
      "attachToPartNumber": 2,
      "targetTP": {
        "tpNumber": 1,
        "title": "TP 1: Title of the TP",
        "description": "All exercises and tasks needed...",
        "requiredConceptNames": ["Existing Concept 1", "Existing Concept 2"],
        "estimatedMinutes": 90,
        "deadline": ""
      }
    }
  ],` : ''}
  "parts": [
    {
      "partNumber": 1,
      "title": "Part 1: Title of the part",
      "description": "The big picture of this part, why you learn it, and how it benefits you...",
      "mustLearnConcepts": [
        {
          "name": "Concept 1 Name",
          "summary": "Deep technical explanation...",
          "searchQuery": "Concept 1 tutorial guide",
          "additionalNotes": "Key commands and exam notes"
        }
      ],
      "targetTP": null
    }
  ]
}`;

  try {
    const rawText = await callGeminiWithFallback(prompt, activeKey);

    if (!rawText) {
      console.warn('Gemini API call failed across all models, using fallback');
      return generateFallbackMasterStudyPlan(input, existingPlan);
    }

    const parsed = JSON.parse(rawText);

    // Map notices
    const attentionNotices: ClassIntelNotice[] = (parsed.attentionNotices || []).map(
      (n: any, idx: number) => ({
        id: 'notice_' + Date.now() + '_' + idx,
        category: n.category || 'teacher_warning',
        sessionSource: n.sessionSource || 'Class Session',
        title: n.title || 'Important Notice',
        details: n.details || '',
        isDismissed: false,
      })
    );

    // Map TP attachments onto existing parts when extending
    const pendingTPAttachments: TPAttachment[] = [];
    if (existingPlan && Array.isArray(parsed.tpAttachments)) {
      for (let aIdx = 0; aIdx < parsed.tpAttachments.length; aIdx++) {
        const rawAtt = parsed.tpAttachments[aIdx];
        if (!rawAtt?.targetTP) continue;
        const requestedNum = Number(rawAtt.attachToPartNumber);
        const matchedPart =
          existingPlan.parts.find((p) => p.partNumber === requestedNum) ||
          existingPlan.parts[existingPlan.parts.length - 1];
        if (!matchedPart) continue;

        const tpObj = buildMilestoneTP(
          rawAtt.targetTP,
          rawAtt.targetTP.tpNumber || aIdx + 1,
          matchedPart.mustLearnConcepts.map((c) => c.name),
          findMatchingRawTPContent(rawAtt.targetTP.title || '', input.tpDocuments)
        );
        pendingTPAttachments.push({
          attachToPartNumber: matchedPart.partNumber,
          attachToPartTitle: matchedPart.title,
          targetTP: tpObj,
        });
      }
    }

    // Map parts and fetch multiple rich video resources for each concept!
    const parts: SubjectStudyPart[] = [];
    const basePartNum = existingPlan ? existingPlan.parts.length : 0;

    for (let pIdx = 0; pIdx < (parsed.parts || []).length; pIdx++) {
      const rawPart = parsed.parts[pIdx];
      const partNumber = basePartNum + pIdx + 1;
      const partId = 'part_' + Date.now() + '_' + partNumber;

      const mustLearnConcepts: StudyConcept[] = [];
      for (let cIdx = 0; cIdx < (rawPart.mustLearnConcepts || []).length; cIdx++) {
        const rawC = rawPart.mustLearnConcepts[cIdx];
        const query = rawC.searchQuery || `${rawC.name} ${input.subjectName} tutorial`;

        // Rich YouTube search: fetch up to 4 video options per concept (no duration limit)!
        const videoResources = await searchConceptVideoResources(query, 4);

        mustLearnConcepts.push({
          id: 'concept_' + Date.now() + '_' + pIdx + '_' + cIdx,
          name: rawC.name || 'Core Concept',
          summary: rawC.summary || '',
          searchQuery: query,
          videoResources,
          additionalNotes: rawC.additionalNotes || '',
          isCompleted: false,
        });
      }

      const targetTP = rawPart.targetTP
        ? buildMilestoneTP(
            rawPart.targetTP,
            partNumber,
            mustLearnConcepts.map((c) => c.name),
            findMatchingRawTPContent(rawPart.targetTP.title || '', input.tpDocuments)
          )
        : undefined;

      const rawTitle = (rawPart.title || `Core Foundations`)
        .replace(/^Part\s+\d+\s*[:\-–]\s*/i, '')
        .trim();

      parts.push({
        id: partId,
        partNumber,
        title: rawTitle || `Core Foundations`,
        description: rawPart.description || '',
        mustLearnConcepts,
        targetTP,
        isCompleted: false,
      });
    }

    const totalSessions = existingPlan ? input.transcripts.length : Math.max(1, input.transcripts.length);

    const fullPlan: SubjectStudyPlan = {
      bigPictureDescription:
        parsed.bigPictureDescription ||
        existingPlan?.bigPictureDescription ||
        `Comprehensive curriculum and practical roadmap for ${input.subjectName}.`,
      totalSessionsAnalyzed: totalSessions,
      attentionNotices,
      parts,
      pendingTPAttachments: pendingTPAttachments.length > 0 ? pendingTPAttachments : undefined,
      lastUpdated: new Date().toISOString(),
    };

    return fullPlan;
  } catch (err) {
    console.warn('Master study plan generation failed, falling back:', err);
    return generateFallbackMasterStudyPlan(input, existingPlan);
  }
}

// Intelligent multi-part fallback when offline or no API key is provided
export async function generateFallbackMasterStudyPlan(
  input: MultiSessionInput,
  existingPlan?: SubjectStudyPlan
): Promise<SubjectStudyPlan> {
  const combined = [
    ...input.transcripts.map((t) => t.content),
    ...input.tpDocuments.map((t) => t.content),
    ...input.courseDocuments.map((t) => t.content),
    input.additionalNotes || '',
  ]
    .join('\n')
    .toLowerCase();

  const isLinux =
    combined.includes('lvm') || combined.includes('debian') || combined.includes('linux');

  const basePart = existingPlan ? existingPlan.parts.length : 0;
  const parts: SubjectStudyPart[] = [];
  const pendingTPAttachments: TPAttachment[] = [];

  // When extending an existing roadmap with TP-only uploads, attach directly under matching existing parts
  if (
    existingPlan &&
    existingPlan.parts.length > 0 &&
    input.tpDocuments.length > 0 &&
    input.transcripts.length === 0 &&
    input.courseDocuments.length === 0
  ) {
    input.tpDocuments.forEach((tpDoc, idx) => {
      const cleanTpTitle = tpDoc.name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]/g, ' ');
      const matchedPart = findBestExistingPartForTP(cleanTpTitle, tpDoc.content, existingPlan.parts);
      const tpObj = buildMilestoneTP(
        {
          tpNumber: idx + 1,
          title: cleanTpTitle.toUpperCase().startsWith('TP') ? cleanTpTitle : `TP ${idx + 1}: ${cleanTpTitle}`,
          description: tpDoc.content
            ? tpDoc.content.slice(0, 600).trim()
            : `Complete practical lab exercises for ${cleanTpTitle}.`,
          requiredConceptNames: matchedPart.mustLearnConcepts.map((c) => c.name),
          estimatedMinutes: 90,
        },
        idx + 1,
        matchedPart.mustLearnConcepts.map((c) => c.name)
      );
      pendingTPAttachments.push({
        attachToPartNumber: matchedPart.partNumber,
        attachToPartTitle: matchedPart.title,
        targetTP: tpObj,
      });
    });

    return {
      bigPictureDescription: existingPlan.bigPictureDescription,
      totalSessionsAnalyzed: 0,
      attentionNotices: [],
      parts: [],
      pendingTPAttachments,
      lastUpdated: new Date().toISOString(),
    };
  }

  // If user provided multiple TP documents, generate a distinct part for EACH TP document!
  const tpList = input.tpDocuments.length > 0
    ? input.tpDocuments
    : [
        { name: 'TP 1: Setup & Foundations', content: '' },
        { name: 'TP 2: Implementation & Resizing', content: '' },
        { name: 'TP 3: Advanced Labs & Recovery', content: '' },
      ];

  for (let idx = 0; idx < tpList.length; idx++) {
    const tpDoc = tpList[idx];
    const partNumber = basePart + idx + 1;
    const cleanTpTitle = tpDoc.name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]/g, ' ');

    let conceptNames: Array<{ name: string; summary: string; query: string }> = [];

    if (isLinux) {
      if (idx === 0) {
        conceptNames = [
          {
            name: 'Linux Block Devices & Partitioning (lsblk, fdisk)',
            summary: 'Understanding raw disk geometry (/dev/sda, /dev/nvme), partition table types (MBR vs GPT), and sector layout.',
            query: 'Linux block storage devices fdisk lsblk tutorial',
          },
          {
            name: 'Filesystem Creation & Mounting (mkfs.ext4, /etc/fstab)',
            summary: 'Formatting partitions into usable filesystems and configuring persistent boot mounting with UUIDs.',
            query: 'Linux mkfs ext4 mount fstab tutorial',
          },
          {
            name: 'LVM Architecture: Physical Volumes (pvcreate)',
            summary: 'Initializing raw block devices into Physical Volumes with 4MB Physical Extents for volume aggregation.',
            query: 'Linux LVM pvcreate physical volumes tutorial',
          },
        ];
      } else if (idx === 1) {
        conceptNames = [
          {
            name: 'Volume Groups Aggregation (vgcreate, vgextend)',
            summary: 'Combining multiple Physical Volumes into a flexible, pooled storage container.',
            query: 'Linux LVM vgcreate volume groups tutorial',
          },
          {
            name: 'Logical Volumes Carving & Formatting (lvcreate)',
            summary: 'Allocating virtual partitions with custom sizes and configuring dynamic block devices.',
            query: 'Linux LVM lvcreate logical volume tutorial',
          },
          {
            name: 'Online Volume Resizing (lvextend, resize2fs)',
            summary: 'Expanding active logical volumes on live servers without unmounting using lvextend -r.',
            query: 'lvextend resize2fs online volume expansion Linux',
          },
        ];
      } else {
        conceptNames = [
          {
            name: 'LVM Point-in-Time Snapshots (lvcreate -s)',
            summary: 'Creating zero-downtime copy-on-write snapshot volumes for instant backup and testing.',
            query: 'Linux LVM snapshots backup tutorial',
          },
          {
            name: 'Snapshot Recovery & Volume Merging (lvconvert --merge)',
            summary: 'Restoring live systems back to pristine snapshot checkpoints after emergency failures.',
            query: 'Linux LVM snapshot revert restore guide',
          },
          {
            name: 'Storage Monitoring & Maintenance (pvs, vgs, lvs)',
            summary: 'Real-time auditing of extent utilization, thin provisioning, and storage health.',
            query: 'Linux LVM pvs vgs lvs command cheatsheet',
          },
        ];
      }
    } else {
      conceptNames = [
        {
          name: `${cleanTpTitle} Core Foundations`,
          summary: `Theoretical principles and architecture needed to complete ${cleanTpTitle}.`,
          query: `${input.subjectName} ${cleanTpTitle} tutorial`,
        },
        {
          name: `${cleanTpTitle} Practical Workflows`,
          summary: `Step-by-step methodology and implementation rules required for this practical lab.`,
          query: `${input.subjectName} hands on guide`,
        },
        {
          name: `${cleanTpTitle} Common Pitfalls & Edge Cases`,
          summary: `Critical errors, troubleshooting techniques, and performance considerations.`,
          query: `${input.subjectName} practical exercises and troubleshooting`,
        },
      ];
    }

    const concepts: StudyConcept[] = [];
    for (let cIdx = 0; cIdx < conceptNames.length; cIdx++) {
      const c = conceptNames[cIdx];
      const videoResources = await searchConceptVideoResources(c.query, 4);

      concepts.push({
        id: `concept_fb_${partNumber}_${cIdx}_${Date.now()}`,
        name: c.name,
        summary: c.summary,
        searchQuery: c.query,
        videoResources,
        isCompleted: false,
      });
    }

    const targetTP: SubjectMilestoneTP = {
      id: `tp_fb_${partNumber}_${Date.now()}`,
      tpNumber: partNumber,
      title: cleanTpTitle.startsWith('TP') ? cleanTpTitle : `TP ${partNumber}: ${cleanTpTitle}`,
      description: `Complete all practical lab exercises for Part ${partNumber}. Document all commands, code, and verification outputs.`,
      requiredConceptNames: concepts.map((c) => c.name),
      estimatedMinutes: 90,
      deadline: `Session ${partNumber} Milestone`,
      isCompleted: false,
    };

    parts.push({
      id: `part_fb_${partNumber}_${Date.now()}`,
      partNumber,
      title: `Part ${partNumber}: ${cleanTpTitle}`,
      description: `Master prerequisite concepts and implement practical work for ${cleanTpTitle}.`,
      mustLearnConcepts: concepts,
      targetTP,
      isCompleted: false,
    });
  }

  const notices: ClassIntelNotice[] = [
    {
      id: 'notice_fb_1',
      category: 'deadline',
      sessionSource: 'Course Schedule',
      title: 'Lab Submissions & Verification',
      details: 'Ensure all terminal outputs and screenshots are included with each TP deliverable.',
      isDismissed: false,
    },
    {
      id: 'notice_fb_2',
      category: 'exam_hint',
      sessionSource: 'Class Lecture',
      title: 'Exam Concepts Highlighted',
      details: 'Pay close attention to prerequisite concepts; commands and architecture will appear on upcoming assessments.',
      isDismissed: false,
    },
  ];

  return {
    bigPictureDescription: isLinux
      ? 'Logical Volume Management provides dynamic disk virtualization for Linux servers. Instead of fixed, rigid physical hard drives that require risky downtime to resize, LVM aggregates storage across drives to allow live resizing, snapshots, and flexible storage tiers on production systems.'
      : `Comprehensive step-by-step academic curriculum for ${input.subjectName}, structured sequentially into prerequisite concept learning and hands-on milestone labs.`,
    totalSessionsAnalyzed: existingPlan ? input.transcripts.length : Math.max(1, input.transcripts.length),
    attentionNotices: notices,
    parts,
    lastUpdated: new Date().toISOString(),
  };
}

// Quick analysis for single-session backward compatibility
export async function analyzeLectureWithGemini(
  transcript: string,
  tpContent: string = '',
  subjectHint: string = '',
  apiKey: string = ''
): Promise<AIDigestResult> {
  const activeKey = apiKey.trim() || getSavedGeminiKey();

  if (!activeKey) {
    return analyzeWithFallbackHeuristics(transcript, tpContent, subjectHint);
  }

  const prompt = `You are an expert academic tutor and study planner.
Analyze the following online class lecture transcription and attached TP/homework lab instructions.

Target Subject: ${subjectHint || 'General Studies'}

=== LECTURE TRANSCRIPTION (Teams / Wispr Flow) ===
${transcript.slice(0, 80000)}

=== ATTACHED TP / HOMEWORK LAB DOCUMENT CONTENT ===
${tpContent ? tpContent.slice(0, 50000) : 'None provided'}

=== INSTRUCTIONS ===
1. Extract any homework, practical works (TP), problem sets, or lab assignments discussed or given in the files/transcript.
   Estimate realistic completion duration in minutes (e.g. 60, 90, 120).
   Write clear action notes with required commands, steps, or questions to solve.

2. Extract 2 to 5 specific, core technical or academic concepts that the student must research, watch, or review to understand the material and finish the TP.
   For each concept:
   - Provide a "conceptName" (e.g. "Linux LVM Partitioning & Volume Groups").
   - Provide "whyNeeded" (1 sentence explaining why this is crucial for the class/TP).
   - Provide an optimal "youtubeSearchQuery" designed to return the best educational tutorials on YouTube.
   - Provide a "videoNote" explaining specifically what concepts from the session this video will clarify.

Respond ONLY with valid JSON in this exact structure:
{
  "summary": "2-3 sentence overview of what was covered in this lecture and what is required",
  "tasks": [
    {
      "title": "TP / Task Name",
      "notes": "Steps, tools, questions to solve",
      "plannedDuration": 90,
      "priority": "essential"
    }
  ],
  "concepts": [
    {
      "conceptName": "Name of concept",
      "whyNeeded": "Why student needs to understand this",
      "youtubeSearchQuery": "Optimized YouTube search query for educational tutorial",
      "videoNote": "Concepts covered: LVM commands, pvcreate, vgcreate, lvcreate"
    }
  ]
}`;

  try {
    const rawText = await callGeminiWithFallback(prompt, activeKey);
    if (!rawText) {
      return analyzeWithFallbackHeuristics(transcript, tpContent, subjectHint);
    }

    const parsed = JSON.parse(rawText);

    const tasks: AIExtractedTask[] = (parsed.tasks || []).map((t: any, idx: number) => ({
      id: 'task_ai_' + Date.now() + '_' + idx,
      title: t.title || 'Homework Assignment',
      notes: t.notes || '',
      plannedDuration: Number(t.plannedDuration) || 60,
      priority: (t.priority as PriorityLevel) || 'essential',
      selected: true,
    }));

    const concepts: AIConcept[] = (parsed.concepts || []).map((c: any, idx: number) => ({
      id: 'concept_' + Date.now() + '_' + idx,
      conceptName: c.conceptName || 'Study Topic',
      whyNeeded: c.whyNeeded || 'Recommended review topic from class',
      youtubeSearchQuery: c.youtubeSearchQuery || c.conceptName,
      videoNote: c.videoNote || `Explains ${c.conceptName} discussed in class`,
    }));

    const conceptsWithVideos = await matchVideosForConcepts(concepts);

    return {
      summary: parsed.summary || 'Class session and assignment analysis.',
      tasks,
      concepts: conceptsWithVideos,
    };
  } catch (err) {
    console.warn('Gemini request failed, using intelligent heuristics:', err);
    return analyzeWithFallbackHeuristics(transcript, tpContent, subjectHint);
  }
}

export async function analyzeWithFallbackHeuristics(
  transcript: string,
  tpContent: string = '',
  subjectHint: string = ''
): Promise<AIDigestResult> {
  const combined = (transcript + '\n' + tpContent).trim();
  const lower = combined.toLowerCase();

  const tasks: AIExtractedTask[] = [];
  const rawConcepts: AIConcept[] = [];

  const rawMatches = combined.match(/(?:TP|Travaux Pratiques|Homework|Devoir|Lab|Assignment|Projet)\s*[:#\-_]?\s*[A-Za-z0-9\-_.]+/gi) || [];
  const uniqueTps = Array.from(
    new Set(
      rawMatches
        .map((m) => m.replace(/[.:,\s]+$/, '').trim())
        .filter((m) => {
          const lowerM = m.toLowerCase();
          if (/^(tp|travaux|homework|devoir|lab|assignment|projet)\s*(de|du|d'|a|à|pour|o|\.)$/i.test(lowerM)) {
            return false;
          }
          return m.length >= 4;
        })
    )
  );

  if (uniqueTps.length > 0) {
    uniqueTps.slice(0, 3).forEach((tpName, i) => {
      tasks.push({
        id: 'task_ai_hb_' + Date.now() + '_' + i,
        title: tpName,
        notes: `Work on ${tpName}. Review requirements discussed in session and complete exercises.`,
        plannedDuration: 90,
        priority: 'essential',
        selected: true,
      });
    });
  } else {
    tasks.push({
      id: 'task_ai_hb_' + Date.now(),
      title: `${subjectHint || 'Online Class'} Homework & Exercises`,
      notes: 'Review class notes, implement lab assignments, and verify solutions.',
      plannedDuration: 60,
      priority: 'essential',
      selected: true,
    });
  }

  if (lower.includes('lvm') || lower.includes('logical volume') || lower.includes('debian')) {
    rawConcepts.push({
      id: 'concept_lvm_' + Date.now(),
      conceptName: 'Linux Logical Volume Manager (LVM) Setup & Resizing',
      whyNeeded: 'Essential for disk partitioning, volume groups, and Debian TP exercises.',
      youtubeSearchQuery: 'Linux LVM tutorial Debian 13 step by step',
      videoNote: 'Covers: pvcreate, vgcreate, lvcreate, and resizing partitions without reboot.',
    });
  }

  if (lower.includes('debian') || lower.includes('linux') || lower.includes('bash') || lower.includes('terminal')) {
    rawConcepts.push({
      id: 'concept_debian_' + Date.now(),
      conceptName: 'Debian 13 Linux Administration & System Management',
      whyNeeded: 'Core operating system environment used in your lab homework.',
      youtubeSearchQuery: 'Debian 13 administration beginner tutorial',
      videoNote: 'Covers: package management, systemd, and terminal navigation for labs.',
    });
  }

  if (lower.includes('french') || lower.includes('français') || lower.includes('tv5') || lower.includes('grammaire')) {
    rawConcepts.push({
      id: 'concept_french_' + Date.now(),
      conceptName: 'French Listening Comprehension & Grammar Drills',
      whyNeeded: 'Required for active recall and B1-C1 fluency progress.',
      youtubeSearchQuery: 'French grammar B1 B2 lesson practice',
      videoNote: 'Covers: verb conjugations, oral listening drills, and vocabulary.',
    });
  }

  if (rawConcepts.length === 0) {
    rawConcepts.push({
      id: 'concept_gen_' + Date.now(),
      conceptName: `${subjectHint || 'Lecture'} Core Concepts Review`,
      whyNeeded: 'Key subject explanation to reinforce concepts from the evening class.',
      youtubeSearchQuery: `${subjectHint || 'Computer Science'} tutorial complete guide`,
      videoNote: `Explains primary topics and homework exercises for ${subjectHint || 'this subject'}.`,
    });
  }

  const conceptsWithVideos = await matchVideosForConcepts(rawConcepts);

  return {
    summary: `Identified ${tasks.length} assignment tasks and ${rawConcepts.length} core concepts from your session.`,
    tasks,
    concepts: conceptsWithVideos,
  };
}

function safeParseGeminiJSON(rawText: string): any {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

function stripPartPrefix(title: string): string {
  return title.replace(/^Part\s+\d+\s*[:\-–]\s*/i, '').trim() || title.trim();
}

export interface CourseAuditInput {
  subjectName: string;
  courseDocuments: Array<{ name: string; content: string }>;
  existingPlan: SubjectStudyPlan;
  additionalNotes?: string;
  apiKey?: string;
}

/**
 * Audits an existing SubjectStudyPlan against uploaded Course PDF(s) using Gemini.
 * Verifies whether all course topics and TP prerequisites are covered and well ordered,
 * returning either a "perfect" verdict or structured enhancements/new parts/reorder suggestions for review.
 */
export async function auditStudyPlanWithCoursePDF(
  input: CourseAuditInput
): Promise<CoursePlanAuditResult> {
  const activeKey = input.apiKey?.trim() || getSavedGeminiKey();
  if (!activeKey) {
    throw new Error('Gemini API Key is required to run an AI Course Plan Audit.');
  }

  const combinedCourseDocs = input.courseDocuments
    .map((cd, i) => `=== COURSE DOCUMENT ${i + 1}: ${cd.name} ===\n${cd.content}`)
    .join('\n\n')
    .slice(0, 250000);

  if (!combinedCourseDocs.trim()) {
    throw new Error('No readable course content found in the uploaded Course PDF.');
  }

  const existingParts = input.existingPlan.parts;
  const serializedPlan = existingParts
    .map((p) => {
      const tps = [p.targetTP, ...(p.additionalTPs || [])].filter(Boolean) as SubjectMilestoneTP[];
      const tpLines =
        tps.length > 0
          ? tps
              .map(
                (tp) =>
                  `    - TP ${tp.tpNumber}: "${tp.title}" (${tp.isCompleted ? 'DONE' : 'TODO'})\n` +
                  `      Summary: ${tp.description.slice(0, 260)}\n` +
                  `      Required Concepts: ${(tp.requiredConceptNames || []).join(', ') || 'None specified'}`
              )
              .join('\n')
          : '    (None attached)';

      const conceptLines =
        p.mustLearnConcepts.length > 0
          ? p.mustLearnConcepts
              .map((c) => `    - ${c.name}: ${c.summary.slice(0, 220)}`)
              .join('\n')
          : '    (None)';

      return [
        `PART ${p.partNumber}: "${stripPartPrefix(p.title)}" [${p.isCompleted ? 'DONE' : 'NOT DONE'}]`,
        `  Description: ${p.description}`,
        `  Concepts Covered (${p.mustLearnConcepts.length}):`,
        conceptLines,
        `  Attached Practical Labs (TPs):`,
        tpLines,
      ].join('\n');
    })
    .join('\n\n');

  const prompt = `You are an expert university curriculum architect reviewing a student's existing interactive study roadmap for "${input.subjectName}" against the official Course PDF/syllabus.

=== COURSE PDF CONTENT ===
${combinedCourseDocs}

${input.additionalNotes?.trim() ? `=== STUDENT FOCUS / EXTRA NOTES ===\n${input.additionalNotes.trim()}\n` : ''}
=== EXISTING STUDY ROADMAP (${existingParts.length} PARTS) ===
Subject Big Picture: ${input.existingPlan.bigPictureDescription}

${serializedPlan}

=== YOUR AUDIT TASK ===
Carefully compare the Course PDF (every chapter, topic, command, theory module, and prerequisite progression) AND the attached TPs against the EXISTING STUDY ROADMAP above:
1. Check whether EVERY meaningful concept and chapter from the Course PDF is already covered in the existing parts.
2. Check whether existing parts are cleanly scoped and well planned (including prerequisite ordering for both the course topics AND the attached TP concepts).
3. BE ACCURATE AND WELL-CALIBRATED (CRITICAL):
   - Evaluate substantive coverage, NOT wording style! If a topic from the Course PDF is genuinely covered inside an existing part/concept under slightly different wording, treat it as COVERED.
   - DO NOT invent tiny cosmetic edits or paraphrase existing titles just to look busy!
   - If the existing parts already cover the Course PDF thoroughly and are logically ordered, you MUST return:
     * "status": "perfect"
     * "coverageScore": 100 (or 95-100)
     * "overallVerdict": "Everything is already perfect! ..." (clear reassuring explanation)
     * "coveredHighlights": concise list confirming which PDF modules/topics map cleanly to existing parts
     * "missingTopicsSummary": []
     * "reorderSuggestion": { "recommended": false, "reason": "", "orderedPartNumbers": [] }
     * "enhancements": []
     * "newParts": []
     * "additionalNotices": []
   - ONLY set "status": "needs_improvement" if there are GENUINE gaps or planning flaws:
     a) Missing concepts that fit naturally into an existing Part -> add an item to "enhancements" targeting that "targetPartNumber".
     b) An existing Part whose title/description is misleading or poorly planned vs the Course PDF -> add "suggestedTitle" / "suggestedDescription" inside "enhancements" (otherwise set them to null!).
     c) Entire Course PDF modules/topics NOT covered anywhere in the existing parts -> add to "newParts", specifying "insertPosition": "start" | "after_part" | "end" and "insertAfterPartNumber" (pointing to the original existing Part number 1..${existingParts.length} it should follow, or null when "start"/"end") so prerequisite order stays strict!
     d) Existing parts out of prerequisite order -> set "reorderSuggestion.recommended": true and provide "orderedPartNumbers" containing EVERY integer from 1 to ${existingParts.length} EXACTLY ONCE in optimal prerequisite order.
     e) Never duplicate any existing part title or existing concept name!

Respond ONLY with valid JSON matching this schema:
{
  "status": "perfect" | "needs_improvement",
  "coverageScore": 0-100,
  "overallVerdict": "Clear summary explaining the audit verdict...",
  "coveredHighlights": ["Chapter 1 & 2 covered cleanly in Part 1 & Part 2", "..."],
  "missingTopicsSummary": ["..."],
  "reorderSuggestion": {
    "recommended": false,
    "reason": "",
    "orderedPartNumbers": []
  },
  "enhancements": [
    {
      "targetPartNumber": 2,
      "enhancementType": "add_concepts" | "refine_scope",
      "reason": "Why this existing part should be enhanced based on the Course PDF...",
      "suggestedTitle": null,
      "suggestedDescription": null,
      "conceptsToAdd": [
        {
          "name": "Precise Concept Name",
          "summary": "Deep 3-4 sentence explanation covering mechanics & exam relevance.",
          "searchQuery": "Focused YouTube tutorial search query",
          "additionalNotes": "Key commands, syntax, or exam tips"
        }
      ]
    }
  ],
  "newParts": [
    {
      "insertPosition": "after_part" | "start" | "end",
      "insertAfterPartNumber": 4,
      "reason": "Chapter X in the Course PDF covers ... which is currently missing.",
      "title": "Descriptive Part Title (without Part N: prefix)",
      "description": "What happens under the hood, why you learn it, and how it benefits you.",
      "mustLearnConcepts": [
        {
          "name": "Concept Name",
          "summary": "Deep 3-4 sentence explanation...",
          "searchQuery": "Focused YouTube tutorial query",
          "additionalNotes": "Key commands / gotchas"
        }
      ],
      "targetTP": null
    }
  ],
  "additionalNotices": []
}`;

  const rawText = await callGeminiWithFallback(prompt, activeKey);
  if (!rawText) {
    throw new Error('Gemini API request failed across all configured models. Check your API key and network connection.');
  }

  let parsed: any;
  try {
    parsed = safeParseGeminiJSON(rawText);
  } catch (err) {
    console.error('Failed to parse audit JSON:', err, rawText);
    throw new Error('The AI returned an invalid response format. Please retry the audit.');
  }

  const partByNumber = new Map<number, SubjectStudyPart>();
  existingParts.forEach((p) => partByNumber.set(p.partNumber, p));

  const existingTitleSet = new Set(
    existingParts.map((p) => stripPartPrefix(p.title).toLowerCase())
  );

  // Sanitize reorder suggestion (strictly preserve every existing part)
  let reorderSuggestion: AuditReorderSuggestion | undefined;
  const rawReorder = parsed.reorderSuggestion;
  if (rawReorder?.recommended && Array.isArray(rawReorder.orderedPartNumbers)) {
    const seenIds = new Set<string>();
    const orderedIds: string[] = [];
    for (const num of rawReorder.orderedPartNumbers) {
      const part = partByNumber.get(Number(num));
      if (part && !seenIds.has(part.id)) {
        seenIds.add(part.id);
        orderedIds.push(part.id);
      }
    }
    for (const p of existingParts) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        orderedIds.push(p.id);
      }
    }
    const orderChanged = orderedIds.some((id, idx) => existingParts[idx]?.id !== id);
    if (orderChanged && orderedIds.length === existingParts.length) {
      reorderSuggestion = {
        recommended: true,
        reason: rawReorder.reason || 'Reorders parts to enforce prerequisite flow across the course and TPs.',
        orderedPartIds: orderedIds,
      };
    }
  }

  // Sanitize enhancements targeting valid existing parts
  const enhancements: AuditPartEnhancement[] = [];
  if (Array.isArray(parsed.enhancements)) {
    for (let idx = 0; idx < parsed.enhancements.length; idx++) {
      const rawEnh = parsed.enhancements[idx];
      const targetPart = partByNumber.get(Number(rawEnh?.targetPartNumber));
      if (!targetPart) continue;

      const existingConceptNames = new Set(
        targetPart.mustLearnConcepts.map((c) => c.name.trim().toLowerCase())
      );

      const conceptsToAdd: AuditConceptDraft[] = Array.isArray(rawEnh.conceptsToAdd)
        ? rawEnh.conceptsToAdd
            .filter((c: any) => c?.name && !existingConceptNames.has(String(c.name).trim().toLowerCase()))
            .map((c: any) => ({
              name: String(c.name).trim(),
              summary: String(c.summary || '').trim(),
              searchQuery: String(c.searchQuery || `${c.name} ${input.subjectName} tutorial`).trim(),
              additionalNotes: c.additionalNotes ? String(c.additionalNotes).trim() : '',
            }))
        : [];

      const cleanedSuggestedTitle =
        rawEnh.suggestedTitle && typeof rawEnh.suggestedTitle === 'string'
          ? stripPartPrefix(rawEnh.suggestedTitle)
          : undefined;
      const hasTitleChange =
        !!cleanedSuggestedTitle &&
        cleanedSuggestedTitle.toLowerCase() !== stripPartPrefix(targetPart.title).toLowerCase();

      const cleanedSuggestedDesc =
        rawEnh.suggestedDescription && typeof rawEnh.suggestedDescription === 'string'
          ? rawEnh.suggestedDescription.trim()
          : undefined;
      const hasDescChange =
        !!cleanedSuggestedDesc && cleanedSuggestedDesc !== targetPart.description.trim();

      if (conceptsToAdd.length === 0 && !hasTitleChange && !hasDescChange) {
        continue;
      }

      enhancements.push({
        id: `enh_${Date.now()}_${idx}`,
        targetPartId: targetPart.id,
        targetPartNumber: targetPart.partNumber,
        targetPartTitle: stripPartPrefix(targetPart.title),
        enhancementType: conceptsToAdd.length > 0 ? 'add_concepts' : 'refine_scope',
        reason: String(rawEnh.reason || 'Enhances alignment with the uploaded Course PDF.'),
        suggestedTitle: hasTitleChange ? cleanedSuggestedTitle : undefined,
        suggestedDescription: hasDescChange ? cleanedSuggestedDesc : undefined,
        conceptsToAdd,
      });
    }
  }

  // Sanitize suggested new parts (never duplicate existing part titles)
  const newParts: AuditNewPartSuggestion[] = [];
  if (Array.isArray(parsed.newParts)) {
    for (let idx = 0; idx < parsed.newParts.length; idx++) {
      const rawNew = parsed.newParts[idx];
      const cleanTitle = stripPartPrefix(String(rawNew?.title || '').trim());
      if (!cleanTitle || existingTitleSet.has(cleanTitle.toLowerCase())) continue;

      const concepts: AuditConceptDraft[] = Array.isArray(rawNew.mustLearnConcepts)
        ? rawNew.mustLearnConcepts
            .filter((c: any) => c?.name)
            .map((c: any) => ({
              name: String(c.name).trim(),
              summary: String(c.summary || '').trim(),
              searchQuery: String(c.searchQuery || `${c.name} ${input.subjectName} tutorial`).trim(),
              additionalNotes: c.additionalNotes ? String(c.additionalNotes).trim() : '',
            }))
        : [];

      if (concepts.length === 0) continue;

      let insertPosition: 'start' | 'after_part' | 'end' =
        rawNew.insertPosition === 'start'
          ? 'start'
          : rawNew.insertPosition === 'after_part'
            ? 'after_part'
            : 'end';

      let anchorPart: SubjectStudyPart | undefined;
      if (insertPosition === 'after_part') {
        const reqNum = Number(rawNew.insertAfterPartNumber);
        if (reqNum === 0) {
          insertPosition = 'start';
        } else {
          anchorPart = partByNumber.get(reqNum);
          if (!anchorPart) insertPosition = 'end';
        }
      }

      existingTitleSet.add(cleanTitle.toLowerCase());
      newParts.push({
        id: `newpart_${Date.now()}_${idx}`,
        insertPosition,
        insertAfterPartId: anchorPart ? anchorPart.id : null,
        insertAfterPartNumber: anchorPart ? anchorPart.partNumber : null,
        insertAfterPartTitle: anchorPart ? stripPartPrefix(anchorPart.title) : undefined,
        reason: String(rawNew.reason || 'Covers missing material from the Course PDF.'),
        title: cleanTitle,
        description: String(rawNew.description || ''),
        mustLearnConcepts: concepts,
        targetTP: rawNew.targetTP
          ? {
              tpNumber: Number(rawNew.targetTP.tpNumber) || idx + 1,
              title: String(rawNew.targetTP.title || `TP Lab`),
              description: String(rawNew.targetTP.description || ''),
              requiredConceptNames: Array.isArray(rawNew.targetTP.requiredConceptNames)
                ? rawNew.targetTP.requiredConceptNames
                : concepts.map((c) => c.name),
              estimatedMinutes: Number(rawNew.targetTP.estimatedMinutes) || 90,
              deadline: rawNew.targetTP.deadline || undefined,
            }
          : null,
      });
    }
  }

  const additionalNotices: ClassIntelNotice[] = Array.isArray(parsed.additionalNotices)
    ? parsed.additionalNotices
        .filter((n: any) => n?.title)
        .map((n: any, idx: number) => ({
          id: `notice_audit_${Date.now()}_${idx}`,
          category: n.category || 'teacher_warning',
          sessionSource: n.sessionSource || 'Course PDF Audit',
          title: String(n.title),
          details: String(n.details || ''),
          isDismissed: false,
        }))
    : [];

  const hasActionableChanges =
    !!reorderSuggestion?.recommended ||
    enhancements.length > 0 ||
    newParts.length > 0;

  const normalizedStatus: 'perfect' | 'needs_improvement' =
    parsed.status === 'perfect' && !hasActionableChanges
      ? 'perfect'
      : hasActionableChanges
        ? 'needs_improvement'
        : 'perfect';

  return {
    status: normalizedStatus,
    coverageScore:
      normalizedStatus === 'perfect'
        ? Math.max(95, Number(parsed.coverageScore) || 100)
        : Math.min(94, Math.max(10, Number(parsed.coverageScore) || 75)),
    overallVerdict:
      String(parsed.overallVerdict || '').trim() ||
      (normalizedStatus === 'perfect'
        ? 'Everything is already perfect — your existing parts and concepts accurately cover the Course PDF in proper prerequisite order.'
        : 'The AI identified opportunities to strengthen concept coverage and curriculum planning based on the Course PDF.'),
    coveredHighlights: Array.isArray(parsed.coveredHighlights)
      ? parsed.coveredHighlights.map(String)
      : [],
    missingTopicsSummary: Array.isArray(parsed.missingTopicsSummary)
      ? parsed.missingTopicsSummary.map(String)
      : [],
    reorderSuggestion,
    enhancements,
    newParts,
    additionalNotices,
  };
}

/**
 * Fetches curated YouTube tutorials for accepted audit concepts and new parts
 * before persisting changes into storage.
 */
export async function enrichAuditSuggestionsWithVideos(
  selectedEnhancements: AuditPartEnhancement[],
  selectedNewParts: AuditNewPartSuggestion[]
): Promise<{
  preparedEnhancements: Array<{
    targetPartId: string;
    suggestedTitle?: string;
    suggestedDescription?: string;
    conceptsToAdd: StudyConcept[];
  }>;
  preparedNewParts: Array<{
    insertPosition: 'start' | 'after_part' | 'end';
    insertAfterPartId: string | null;
    part: SubjectStudyPart;
  }>;
}> {
  const stamp = Date.now();
  const preparedEnhancements: Array<{
    targetPartId: string;
    suggestedTitle?: string;
    suggestedDescription?: string;
    conceptsToAdd: StudyConcept[];
  }> = [];

  for (let eIdx = 0; eIdx < selectedEnhancements.length; eIdx++) {
    const enh = selectedEnhancements[eIdx];
    const enrichedConcepts: StudyConcept[] = [];

    for (let cIdx = 0; cIdx < enh.conceptsToAdd.length; cIdx++) {
      const draft = enh.conceptsToAdd[cIdx];
      const videoResources = await searchConceptVideoResources(draft.searchQuery, 4);
      enrichedConcepts.push({
        id: `concept_audit_${stamp}_${eIdx}_${cIdx}_${Math.random().toString(36).substring(2, 6)}`,
        name: draft.name,
        summary: draft.summary,
        searchQuery: draft.searchQuery,
        videoResources,
        additionalNotes: draft.additionalNotes || '',
        isCompleted: false,
      });
    }

    preparedEnhancements.push({
      targetPartId: enh.targetPartId,
      suggestedTitle: enh.suggestedTitle,
      suggestedDescription: enh.suggestedDescription,
      conceptsToAdd: enrichedConcepts,
    });
  }

  const preparedNewParts: Array<{
    insertPosition: 'start' | 'after_part' | 'end';
    insertAfterPartId: string | null;
    part: SubjectStudyPart;
  }> = [];

  for (let pIdx = 0; pIdx < selectedNewParts.length; pIdx++) {
    const suggestion = selectedNewParts[pIdx];
    const enrichedConcepts: StudyConcept[] = [];

    for (let cIdx = 0; cIdx < suggestion.mustLearnConcepts.length; cIdx++) {
      const draft = suggestion.mustLearnConcepts[cIdx];
      const videoResources = await searchConceptVideoResources(draft.searchQuery, 4);
      enrichedConcepts.push({
        id: `concept_np_${stamp}_${pIdx}_${cIdx}_${Math.random().toString(36).substring(2, 6)}`,
        name: draft.name,
        summary: draft.summary,
        searchQuery: draft.searchQuery,
        videoResources,
        additionalNotes: draft.additionalNotes || '',
        isCompleted: false,
      });
    }

    const targetTP = suggestion.targetTP
      ? buildMilestoneTP(
          suggestion.targetTP,
          suggestion.targetTP.tpNumber || pIdx + 1,
          enrichedConcepts.map((c) => c.name)
        )
      : undefined;

    preparedNewParts.push({
      insertPosition: suggestion.insertPosition,
      insertAfterPartId: suggestion.insertAfterPartId,
      part: {
        id: `part_audit_${stamp}_${pIdx}_${Math.random().toString(36).substring(2, 6)}`,
        partNumber: pIdx + 1, // Renumbered sequentially in applyCourseAuditSuggestions
        title: stripPartPrefix(suggestion.title),
        description: suggestion.description,
        mustLearnConcepts: enrichedConcepts,
        targetTP,
        isCompleted: false,
      },
    });
  }

  return { preparedEnhancements, preparedNewParts };
}

export interface TPGuideInput {
  subjectName: string;
  part: SubjectStudyPart;
  tp: SubjectMilestoneTP;
  rawTPContent?: string;
  extraNotes?: string;
  apiKey?: string;
}

/**
 * Generates an interactive, exercise-by-exercise TP Coach Guide:
 * - What we will do in each exercise
 * - Exact steps to execute on the student's machine + answers to questions
 * - Screenshots to take
 * - Exact report layout showing where to place screenshots and answers
 */
export async function generateTPStepByStepGuide(
  input: TPGuideInput
): Promise<TPExecutionGuide> {
  const activeKey = input.apiKey?.trim() || getSavedGeminiKey();
  if (!activeKey) {
    throw new Error('Google Gemini API Key is required to start the AI TP Coach.');
  }

  const effectiveTPText = (input.rawTPContent || input.tp.rawContent || '').trim().slice(0, 120000);
  const conceptContext = input.part.mustLearnConcepts
    .map(
      (c, i) =>
        `${i + 1}. ${c.name}: ${c.summary}${c.additionalNotes ? `\n   Commands/Notes: ${c.additionalNotes}` : ''}`
    )
    .join('\n');

  const prompt = `You are a hands-on university lab instructor mentoring a student step-by-step through a practical assignment (TP) for "${input.subjectName}".

=== LAB / TP METADATA ===
TP Title: ${input.tp.title}
Related Course Part: Part ${input.part.partNumber} - ${input.part.title}
Saved TP Summary: ${input.tp.description}
Required Concepts: ${input.tp.requiredConceptNames.join(', ') || 'See parent concepts below'}

=== PREREQUISITE CONCEPTS & COMMANDS ALREADY TAUGHT IN THIS PART ===
${conceptContext || 'None listed'}

${effectiveTPText ? `=== FULL TP ASSIGNMENT DOCUMENT ===\n${effectiveTPText}\n` : ''}
${input.extraNotes?.trim() ? `=== STUDENT ENVIRONMENT / EXTRA NOTES ===\n${input.extraNotes.trim()}\n` : ''}

=== YOUR COACHING STRATEGY (FOLLOW STRICTLY) ===
Open the TP and guide the student PART BY PART (Exercise 1, Exercise 2, Exercise 3, ..., matching every exercise/section in the TP).
For EVERY Exercise / Part of the TP, produce:
1. "description": Clear description of WHAT we are going to do in this exercise and why.
2. "machineSteps": Concrete, numbered steps to execute on the student's own machine/VM in exact order:
   - "stepNumber": 1, 2, 3...
   - "title": Short action title
   - "instruction": Clear instruction explaining what to type, edit, or verify (with sudo/root hints if needed)
   - "command": Exact copy-ready terminal command(s) or file contents if applicable (empty string if pure GUI/inspection)
   - "expectedResult": What output/confirmation the student should see when it succeeds
3. "questionAnswers": Every theoretical, analytical, observation, or interpretation question present in (or directly tested by) this exercise, with complete, clear, exam/report-ready answers:
   - "question": The exact question
   - "answer": Complete technical answer
   (If an exercise has zero written questions and is purely commands/setup, return []).
4. "screenshotsToTake": Specific screenshots to capture during this exercise so the student never forgets proof before moving on:
   - "label": Short screenshot name (e.g. "Screenshot 1.1: Disk Partition Table")
   - "whatToShow": Exactly which command + terminal/browser output or file content must be visible
   - "captionSuggestion": Ready-to-use figure caption for the lab report
5. "reportSectionLayout": Concrete markdown/document blueprint showing HOW THAT PART OF THE REPORT SHOULD LOOK LIKE:
   - Exact heading (e.g. "## Exercise 1: ...")
   - Brief explanation text template (e.g. what command was run & why)
   - Explicit screenshot placement placeholders like "[INSERT SCREENSHOT 1.1 HERE — Caption: ...]"
   - Exact placement showing where the Question Answers / Observations go!

Also provide:
- "overview": Encouraging 2-3 sentence game plan covering all exercises in this TP.
- "environmentSetup": Brief pre-flight checklist (OS/VM, root/sudo privileges, packages/disks needed before Exercise 1).
- "reportGeneralStructure": Recommended overall structure for the complete TP report (Cover page info, Introduction, Exercises body format, Conclusion).

Respond ONLY with valid JSON matching this exact schema:
{
  "overview": "...",
  "environmentSetup": "...",
  "reportGeneralStructure": "...",
  "exercises": [
    {
      "exerciseNumber": 1,
      "title": "Exercise 1: ...",
      "description": "What we are going to do in this exercise...",
      "machineSteps": [
        {
          "stepNumber": 1,
          "title": "...",
          "instruction": "...",
          "command": "lsblk -f",
          "expectedResult": "Lists block devices..."
        }
      ],
      "questionAnswers": [
        {
          "question": "...",
          "answer": "..."
        }
      ],
      "screenshotsToTake": [
        {
          "label": "Screenshot 1.1: ...",
          "whatToShow": "...",
          "captionSuggestion": "Figure 1: ..."
        }
      ],
      "reportSectionLayout": "## Exercise 1: ...\\n\\n### Objective\\n...\\n\\n### Execution & Capture\\n...\\n[INSERT SCREENSHOT 1.1 HERE — Caption: Figure 1: ...]\\n\\n### Questions & Analysis\\n..."
    }
  ]
}`;

  const rawText = await callGeminiWithFallback(prompt, activeKey);
  if (!rawText) {
    throw new Error('Gemini API call failed across all configured models. Verify your API key and connection.');
  }

  let parsed: any;
  try {
    parsed = safeParseGeminiJSON(rawText);
  } catch (err) {
    console.error('Failed to parse TP guide JSON:', err, rawText);
    throw new Error('The AI returned an invalid format for the TP guide. Please retry.');
  }

  const stamp = Date.now();
  const rawExercises = Array.isArray(parsed.exercises) ? parsed.exercises : [];
  if (rawExercises.length === 0) {
    throw new Error('The AI could not extract structured exercises for this TP. Try attaching the full TP PDF or adding details.');
  }

  const exercises: TPExerciseGuide[] = rawExercises.map((rawEx: any, idx: number) => {
    const exNum = Number(rawEx.exerciseNumber) || idx + 1;

    const machineSteps: TPMachineStep[] = Array.isArray(rawEx.machineSteps)
      ? rawEx.machineSteps.map((st: any, sIdx: number) => ({
          stepNumber: Number(st.stepNumber) || sIdx + 1,
          title: String(st.title || `Step ${sIdx + 1}`),
          instruction: String(st.instruction || ''),
          command: st.command ? String(st.command) : undefined,
          expectedResult: st.expectedResult ? String(st.expectedResult) : undefined,
        }))
      : [];

    const questionAnswers: TPQuestionAnswer[] = Array.isArray(rawEx.questionAnswers)
      ? rawEx.questionAnswers
          .filter((qa: any) => qa?.question || qa?.answer)
          .map((qa: any) => ({
            question: String(qa.question || 'Question'),
            answer: String(qa.answer || ''),
          }))
      : [];

    const screenshotsToTake: TPScreenshotItem[] = Array.isArray(rawEx.screenshotsToTake)
      ? rawEx.screenshotsToTake.map((sc: any, scIdx: number) => ({
          id: `shot_${stamp}_${exNum}_${scIdx}`,
          label: String(sc.label || `Screenshot ${exNum}.${scIdx + 1}`),
          whatToShow: String(sc.whatToShow || ''),
          captionSuggestion: sc.captionSuggestion ? String(sc.captionSuggestion) : undefined,
          isTaken: false,
        }))
      : [];

    return {
      id: `ex_${stamp}_${exNum}`,
      exerciseNumber: exNum,
      title: String(rawEx.title || `Exercise ${exNum}`),
      description: String(rawEx.description || ''),
      machineSteps,
      questionAnswers,
      screenshotsToTake,
      reportSectionLayout: String(rawEx.reportSectionLayout || ''),
      isCompleted: false,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    overview: String(parsed.overview || `Step-by-step execution guide for ${input.tp.title}.`),
    environmentSetup: parsed.environmentSetup ? String(parsed.environmentSetup) : undefined,
    reportGeneralStructure: String(
      parsed.reportGeneralStructure ||
        `1. Title Page (Subject, TP Number & Title, Student Name, Date)\n2. Short Objective\n3. Exercises (Commands + Captioned Screenshots + Question Answers)\n4. Conclusion`
    ),
    exercises,
  };
}

/**
 * Interactive troubleshooting / question helper for a specific TP exercise step.
 */
export async function askTPStepAssistant(input: {
  subjectName: string;
  tpTitle: string;
  exercise: TPExerciseGuide;
  userQuestion: string;
  apiKey?: string;
}): Promise<string> {
  const activeKey = input.apiKey?.trim() || getSavedGeminiKey();
  if (!activeKey) {
    throw new Error('Gemini API Key is required.');
  }

  const stepsSummary = input.exercise.machineSteps
    .map((s) => `Step ${s.stepNumber} (${s.title}): ${s.command || s.instruction}`)
    .join('\n');

  const prompt = `You are a live Linux/CS lab coach helping a student currently executing:
Subject: ${input.subjectName}
TP: ${input.tpTitle}
Current Exercise: ${input.exercise.title}
Objective: ${input.exercise.description}
Steps in this exercise:
${stepsSummary}

Student question or terminal output/error:
"""
${input.userQuestion.trim()}
"""

Give a direct, actionable, practical answer (exact fix, command, or report explanation).
Respond ONLY with valid JSON: { "reply": "..." }`;

  const rawText = await callGeminiWithFallback(prompt, activeKey);
  if (!rawText) {
    throw new Error('Could not reach Gemini AI right now. Check your connection/key.');
  }
  const parsed = safeParseGeminiJSON(rawText);
  return String(parsed.reply || 'Verify syntax and privileges (sudo) and retry the step.');
}
