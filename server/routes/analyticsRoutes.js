import express from "express";
import { protect } from "../middleware/authmiddleware.js";
import Journal from "../models/Journal.js";
import OpenAI from "openai";

const router = express.Router();

/* ===========================
   🔍 1. STRESS PATTERN ANALYSIS
   =========================== */
router.get("/patterns", protect, async (req, res) => {
  try {
    const entries = await Journal.find({ userId: req.user._id });

    const hourly = {};
    const weekday = {};
    const stressWordsCount = {};

    const stressKeywords = [
      "stress",
      "tired",
      "anxiety",
      "panic",
      "pressure",
      "overwhelmed",
      "sad",
      "angry",
      "fear",
      "scared",
    ];

    entries.forEach((j) => {
      const d = new Date(j.createdAt);
      const hour = d.getHours();
      const day = d.toLocaleString("en-US", { weekday: "long" });

      hourly[hour] = hourly[hour] || [];
      weekday[day] = weekday[day] || [];

      hourly[hour].push(j.mood);
      weekday[day].push(j.mood);

      // STRESS KEYWORDS DETECTION
      if (j.text) {
        stressKeywords.forEach((w) => {
          if (j.text.toLowerCase().includes(w)) {
            stressWordsCount[w] = (stressWordsCount[w] || 0) + 1;
          }
        });
      }
    });

    const anxietyHours = Object.entries(hourly).filter(
      ([hour, moods]) => moods.filter((m) => m === "anxious" || m === "sad").length >= 2
    );

    const anxietyDays = Object.entries(weekday).filter(
      ([day, moods]) => moods.filter((m) => m === "anxious" || m === "sad").length >= 2
    );

    res.json({
      anxietyHours,
      anxietyDays,
      stressKeywords: stressWordsCount,
    });
  } catch (err) {
    console.error("Pattern analytics error:", err);
    res.status(500).json({ message: "Failed to analyze patterns" });
  }
});

/* ===========================
   🤖 2. AI INSIGHTS
   =========================== */
router.post("/ai-insights", protect, async (req, res) => {
  try {
    const entries = await Journal.find({ userId: req.user._id });

    const combinedText = entries.map((e) => e.text).join("\n");

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const ai = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `
Analyze the user's journal patterns and provide:
- Stress triggers  
- Anxiety patterns  
- Mood cycles  
- Behavioral insights  
- Personalized coping strategies  

Text:  
${combinedText}
          `,
        },
      ],
    });

    res.json({ insights: ai.choices[0].message.content });
  } catch (err) {
    console.error("AI insights error:", err);
    res.status(500).json({ message: "AI analysis failed" });
  }
});

export default router;
