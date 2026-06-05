import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

// ── AI Analysis Result Interface ───────────────────────────
export interface AiAnalysisResult {
  caseType: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  missingInformation: string[];
  recommendedAction: string;
  confidenceScore: number;
}

// ── Valid case types the AI can classify ───────────────────
const VALID_CASE_TYPES = [
  'Personal Injury',
  'Family Law',
  'Employment Law',
  'Contract Dispute',
  'Property Dispute',
  'Criminal Defense',
  'Immigration',
  'Other',
] as const;

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly model: GenerativeModel;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not configured. ' +
          'Please add it to your .env file.',
      );
    }

    // Initialize the Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use gemini-1.5-flash for fast responses
    // It handles structured JSON output reliably
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',

      // Safety settings - legal content is sensitive
      // We set these to allow legal discussions
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],

      // Generation config for consistent outputs
      generationConfig: {
        temperature: 0.1, // Low temperature = more consistent outputs
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });

    this.logger.log('GeminiService initialized successfully');
  }

  // ── Main analysis method ───────────────────────────────────
  async analyzeLegalCase(
    caseDescription: string,
    clientName: string,
  ): Promise<AiAnalysisResult> {
    this.logger.log(`Starting AI analysis for client: ${clientName}`);

    const prompt = this.buildPrompt(caseDescription);

    try {
      // Send prompt to Gemini
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const rawText = response.text();

      this.logger.log(`Gemini responded with ${rawText.length} characters`);

      // Parse and validate the JSON response
      const analysis = this.parseAndValidateResponse(rawText);

      this.logger.log(
        `Analysis complete: ${analysis.caseType} | ${analysis.priority} priority`,
      );

      return analysis;
    } catch (error) {
      if (error instanceof GeminiParseError) {
        // Re-throw parse errors — they have useful messages
        throw error;
      }

      // Handle Gemini API errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Gemini API error: ${errorMessage}`);

      throw new GeminiApiError(
        `AI service is temporarily unavailable: ${errorMessage}`,
      );
    }
  }

  // ── Build the structured prompt ────────────────────────────
  private buildPrompt(caseDescription: string): string {
    return `You are an experienced legal intake specialist at a law firm.

Your job is to analyze client case descriptions and provide structured assessments to help attorneys prioritize their workload.

Analyze the following client case description carefully.

CLIENT CASE DESCRIPTION:
"""
${caseDescription}
"""

Return ONLY a valid JSON object. 
Do not include any explanation, markdown formatting, code blocks, or additional text.
Return only the raw JSON object and nothing else.

Use exactly this JSON structure:

{
  "caseType": "<one of the exact values listed below>",
  "priority": "<LOW, MEDIUM, or HIGH>",
  "summary": "<2-3 sentence professional summary of the legal matter>",
  "missingInformation": ["<item 1>", "<item 2>", "<item 3>"],
  "recommendedAction": "<specific actionable next step for the firm>",
  "confidenceScore": <number between 0.0 and 1.0>
}

CASE TYPE must be exactly one of these values:
- Personal Injury
- Family Law
- Employment Law
- Contract Dispute
- Property Dispute
- Criminal Defense
- Immigration
- Other

PRIORITY GUIDELINES:
- HIGH: Statute of limitations risk, criminal matter, immediate safety concern, opposing counsel already involved, urgent court deadlines
- MEDIUM: Clear legal matter requiring timely attention, no immediate deadline identified
- LOW: Informational inquiry, minor matter, insufficient information to assess urgency

MISSING INFORMATION should list specific details that would help the attorney evaluate the case. Be specific and practical.

RECOMMENDED ACTION should be a single clear next step the firm should take.

CONFIDENCE SCORE should reflect how confident you are in the classification from 0.0 (not confident) to 1.0 (very confident).

Remember: Return ONLY the JSON object. No other text.`;
  }

  // ── Parse and validate Gemini response ────────────────────
  private parseAndValidateResponse(rawText: string): AiAnalysisResult {
    // Step 1: Clean the response
    // Sometimes Gemini wraps JSON in markdown code blocks
    // even when instructed not to
    let cleanedText = rawText.trim();

    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText
        .replace(/^```json\n?/, '')
        .replace(/\n?```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    cleanedText = cleanedText.trim();

    // Step 2: Parse JSON
    let parsed: Record<string, unknown>;

    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      this.logger.error(
        `Failed to parse Gemini response as JSON: ${cleanedText.substring(0, 200)}`,
      );
      throw new GeminiParseError(
        'AI returned an unexpected response format. Please try again.',
      );
    }

    // Step 3: Validate required fields exist
    const requiredFields = [
      'caseType',
      'priority',
      'summary',
      'missingInformation',
      'recommendedAction',
      'confidenceScore',
    ];

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        this.logger.error(`Missing field in AI response: ${field}`);
        throw new GeminiParseError(
          `AI response is missing required field: ${field}`,
        );
      }
    }

    // Step 4: Validate field values
    const caseType = parsed.caseType as string;
    const priority = parsed.priority as string;

    // Validate caseType is one of our allowed values
    if (
      !VALID_CASE_TYPES.includes(caseType as (typeof VALID_CASE_TYPES)[number])
    ) {
      this.logger.warn(
        `AI returned unexpected caseType: ${caseType}. Defaulting to Other.`,
      );
      parsed.caseType = 'Other';
    }

    // Validate priority
    if (
      !VALID_PRIORITIES.includes(priority as (typeof VALID_PRIORITIES)[number])
    ) {
      this.logger.warn(
        `AI returned unexpected priority: ${priority}. Defaulting to MEDIUM.`,
      );
      parsed.priority = 'MEDIUM';
    }

    // Validate missingInformation is an array
    if (!Array.isArray(parsed.missingInformation)) {
      parsed.missingInformation = [];
    }

    // Validate confidenceScore is a number between 0 and 1
    const confidenceScore = Number(parsed.confidenceScore);
    if (isNaN(confidenceScore) || confidenceScore < 0 || confidenceScore > 1) {
      parsed.confidenceScore = 0.7; // Default confidence
    }

    // Step 5: Return clean typed result
    return {
      caseType: parsed.caseType as string,
      priority: parsed.priority as 'LOW' | 'MEDIUM' | 'HIGH',
      summary: String(parsed.summary),
      missingInformation: (parsed.missingInformation as unknown[]).map(String),
      recommendedAction: String(parsed.recommendedAction),
      confidenceScore: Number(parsed.confidenceScore),
    };
  }
}

// ── Custom error classes ───────────────────────────────────

export class GeminiApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

export class GeminiParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiParseError';
  }
}
