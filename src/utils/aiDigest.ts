import { PriorityLevel, Task, YouTubeVideo } from '../types';

export interface AIConcept {
  id: string;
  conceptName: string;
  whyNeeded: string;
  youtubeSearchQuery: string;
  videoNote: string; // Explains what concepts from the lecture this video covers
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
}

const GEMINI_KEY_STORAGE = 'focusflow_gemini_key';

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

// Search YouTube for each concept query using our native Electron search
export async function matchVideosForConcepts(concepts: AIConcept[]): Promise<AIConcept[]> {
  const results: AIConcept[] = [];

  for (const c of concepts) {
    let matchedVideo: AIConcept['matchedVideo'] | undefined = undefined;

    if (window.electronAPI?.searchYouTube) {
      try {
        const videos = await window.electronAPI.searchYouTube(c.youtubeSearchQuery);
        if (videos && videos.length > 0) {
          // Prefer tutorial videos between 5 and 60 minutes
          const goodMatch = videos.find((v) => v.durationMinutes >= 5 && v.durationMinutes <= 60) || videos[0];
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

// Call Google Gemini API (gemini-2.5-flash or gemini-1.5-flash)
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
${transcript.slice(0, 50000)}

=== ATTACHED TP / HOMEWORK LAB DOCUMENT CONTENT ===
${tpContent ? tpContent.slice(0, 30000) : 'None provided'}

=== INSTRUCTIONS ===
1. Extract any homework, practical works (TP), problem sets, or lab assignments discussed or given in the files/transcript.
   Estimate realistic completion duration in minutes (e.g. 60, 90, 120).
   Write clear action notes with required commands, steps, or questions to solve.

2. Extract 2 to 5 specific, core technical or academic concepts that the student must research, watch, or review to understand the material and finish the TP.
   For each concept:
   - Provide a "conceptName" (e.g. "Linux LVM Partitioning & Volume Groups").
   - Provide "whyNeeded" (1 sentence explaining why this is crucial for the class/TP).
   - Provide an optimal "youtubeSearchQuery" designed to return the best 10 to 30-minute educational tutorial on YouTube (e.g. "Debian 13 LVM tutorial step by step").
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Gemini API returned error, falling back:', errText);
      return analyzeWithFallbackHeuristics(transcript, tpContent, subjectHint);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
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

    // Auto-match YouTube videos for each concept
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

// Intelligent fallback heuristic extractor when no API key is provided
export async function analyzeWithFallbackHeuristics(
  transcript: string,
  tpContent: string = '',
  subjectHint: string = ''
): Promise<AIDigestResult> {
  const combined = (transcript + '\n' + tpContent).trim();
  const lower = combined.toLowerCase();

  const tasks: AIExtractedTask[] = [];
  const rawConcepts: AIConcept[] = [];

  // 1. Look for TP / Homework mentions (ignoring single letters or stop words like "TP o", "TP de", "TP.")
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
    // Default task
    tasks.push({
      id: 'task_ai_hb_' + Date.now(),
      title: `${subjectHint || 'Online Class'} Homework & Exercises`,
      notes: 'Review class notes, implement lab assignments, and verify solutions.',
      plannedDuration: 60,
      priority: 'essential',
      selected: true,
    });
  }

  // 2. Extract technical concepts
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

  // Match videos for concepts
  const conceptsWithVideos = await matchVideosForConcepts(rawConcepts);

  return {
    summary: `Identified ${tasks.length} assignment tasks and ${rawConcepts.length} core concepts from your session.`,
    tasks,
    concepts: conceptsWithVideos,
  };
}
