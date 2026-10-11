import axios from "axios";
import Course from "../models/Course.js";
import Recommendation from "../models/Recommendation.js";
import { getLearnerCompetencyOverview } from "../services/competencyEngine.js";
import { discoverCourses, normalizeResourceUrl } from "../services/courseDiscoveryService.js";
import Competency from "../models/Competency.js";
import TrainingHistory from "../models/TrainingHistory.js";
import Exam from "../models/Exam.js";
import { generateQuizQuestions } from "../services/quizGenerationService.js";

const upsertRecommendation = async ({ userId, competencyId, gap, title, provider, source, sourceUrl }) => {
  if (!competencyId || !title || !sourceUrl) return null;

  return Recommendation.findOneAndUpdate(
    { user: userId, competency: competencyId, sourceUrl },
    {
      $set: {
        user: userId,
        competency: competencyId,
        gap: gap ?? 0,
        title,
        provider: provider || "Learning resource",
        source: source || "serpapi",
        sourceUrl,
      },
      $setOnInsert: {
        sourceType: "other",
        status: "new",
        recommendationStatus: "new",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const getPersonalizedRecommendations = async (req, res) => {
  try {
    const overview = await getLearnerCompetencyOverview(req.user);
    const open = (overview.competencies || []).filter((item) => item.gap?.status === "open").sort((a, b) => (b.gap?.gap || 0) - (a.gap?.gap || 0)).slice(0, 3);
    const recommendations = await Promise.all(open.map(async (item) => ({ competency: item.competency.name, currentLevel: item.current?.currentLevel || 0, requiredLevel: item.requiredLevel, why: `${item.competency.name} is ${item.gap.gap} level(s) below the requirement for ${overview.targetRole}.`, ...(await discoverCourses({ competency: item.competency.name, role: overview.targetRole, gap: item.gap.gap })) })));
    res.json({ integrationStatus: "Prototype integration layer — live iGOT/NSSTA access is not configured.", recommendations });
  } catch (error) { res.status(500).json({ message: "Unable to build recommendations." }); }
};

export const getRecommendedCourses = async (req, res) => {
  try {
    const overview = await getLearnerCompetencyOverview(req.user);
    const open = (overview.competencies || []).filter((item) => item.gap?.status === "open").sort((a, b) => (b.gap?.gap || 0) - (a.gap?.gap || 0)).slice(0, 5);
    const persisted = await Course.find({ user: req.user._id, competency: { $in: open.map((item) => item.competency._id) } }).lean();
    await Promise.all(persisted.map(async (course) => {
      const normalizedLink = normalizeResourceUrl(course.link, course.title, course.competency?.name || "");
      if (normalizedLink !== course.link) {
        course.link = normalizedLink;
        await Course.updateOne({ _id: course._id }, { $set: { link: normalizedLink } });
      }
    }));
    const existing = new Set(persisted.map((item) => `${item.competency}:${item.link}`));
    const created = [];
    for (const item of open) {
      const discovery = await discoverCourses({ competency: item.competency.name, role: overview.targetRole, gap: item.gap.gap });
      for (const resource of discovery.results.slice(0, 3)) {
        if (existing.has(`${item.competency._id}:${resource.url}`)) continue;
        const savedCourse = await Course.create({ user: req.user._id, title: resource.title, link: resource.url, platform: resource.platform, snippet: resource.snippet || "", competency: item.competency._id, currentLevel: item.current?.currentLevel || 0, requiredLevel: item.requiredLevel, recommendationReason: resource.relevanceReason || `${item.competency.name} is below the required role level.`, type: "recommended" });
        await upsertRecommendation({ userId: req.user._id, competencyId: item.competency._id, gap: item.gap?.gap ?? 0, title: resource.title, provider: resource.platform, source: discovery.source, sourceUrl: resource.url });
        existing.add(`${item.competency._id}:${resource.url}`);
        created.push(savedCourse);
      }
    }
    res.json({ courses: [...persisted, ...created], targetRole: overview.targetRole });
  } catch (error) { res.status(500).json({ message: "Unable to load recommended learning.", error: error.message }); }
};

export const completeRecommendedCourse = async (req, res) => {
  let claimedCourse;
  let createdHistory;
  let createdExam;
  try {
    claimedCourse = await Course.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        assessment: null,
        completionStatus: { $in: ["recommended", null] },
      },
      { $set: { completionStatus: "assessment_generating" } },
      { new: true }
    );

    if (!claimedCourse) {
      const currentCourse = await Course.findOne({ _id: req.params.id, user: req.user._id });
      if (!currentCourse) return res.status(404).json({ message: "Learning resource not found." });
      if (currentCourse.assessment) return res.json({ course: currentCourse, assessmentId: currentCourse.assessment, existing: true, completed: true });
      return res.status(409).json({ message: "This course assessment is already being generated. Refresh shortly." });
    }

    if (!claimedCourse.competency) return res.status(400).json({ message: "This course is not linked to a competency." });

    const competency = await Competency.findById(claimedCourse.competency).lean();
    if (!competency) return res.status(400).json({ message: "Course competency is unavailable." });

    const questions = await generateQuizQuestions({ subject: `${competency.name} post-course assessment`, materialText: `Assess practical competency in ${competency.name} after completing ${claimedCourse.title}.`, questions: 8, difficulty: "medium", classification: "CATEGORY_A_OPEN_ACCESS", classificationSource: "ORGANIZATION_POLICY", competencyIds: [claimedCourse.competency], targetProficiencyLevel: claimedCourse.requiredLevel || 3, questionType: "application", sourceReference: `Post-course assessment: ${claimedCourse.title}`, allowFallback: false });
    createdHistory = await TrainingHistory.create({ user: req.user._id, title: claimedCourse.title, provider: claimedCourse.platform, competency: claimedCourse.competency, status: "completed", completedAt: new Date() });
    createdExam = await Exam.create({ title: `${competency.name} post-course assessment`, description: `Evidence assessment after ${claimedCourse.title}.`, subject: competency.name, faculty: req.user._id, duration: 25, totalQuestions: questions.length, questions, competencyTags: [claimedCourse.competency], assessmentType: "DIAGNOSTIC", generatedByModel: process.env.OLLAMA_MODEL, status: "SCHEDULED", scope: "SELECTED", assignedStudents: [req.user._id], scheduledAt: new Date(), trainingHistory: createdHistory._id });
    claimedCourse.trainingHistory = createdHistory._id; claimedCourse.assessment = createdExam._id; claimedCourse.completionStatus = "assessment_created"; await claimedCourse.save();
    await Recommendation.findOneAndUpdate(
      { user: req.user._id, competency: claimedCourse.competency, sourceUrl: claimedCourse.link },
      { $set: { status: "completed", recommendationStatus: "completed", provider: claimedCourse.platform, title: claimedCourse.title, sourceUrl: claimedCourse.link } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ course: claimedCourse, assessmentId: createdExam._id, completed: true });
  } catch (error) {
    if (createdExam?._id) await Exam.deleteOne({ _id: createdExam._id }).catch(() => {});
    if (createdHistory?._id) await TrainingHistory.deleteOne({ _id: createdHistory._id }).catch(() => {});
    if (claimedCourse?._id) await Course.updateOne({ _id: claimedCourse._id, assessment: null }, { $set: { completionStatus: "recommended" } }).catch(() => {});
    res.status(503).json({ message: error.message || "Course assessment generation failed. Confirm the configured Ollama model is available." });
  }
};

export const searchCourses = async (req, res) => {
  try {
    const { keyword, type } = req.query;

    if (!keyword) {
      return res.status(400).json({ message: "Keyword required" });
    }

    // Difficulty detection function
    const detectDifficulty = (text) => {
      text = text.toLowerCase();

      const easyWords = [
        "beginner",
        "basic",
        "introduction",
        "intro",
        "fundamentals",
        "for beginners",
      ];

      const hardWords = [
        "advanced",
        "expert",
        "masterclass",
        "deep dive",
        "professional",
        "bootcamp",
      ];

      if (easyWords.some((word) => text.includes(word))) return "Easy";
      if (hardWords.some((word) => text.includes(word))) return "Hard";

      return "Medium";
    };

    // 🔵 WEB COURSES
    if (type === "web") {
      const response = await axios.get("https://serpapi.com/search.json", {
        params: {
          q: `${keyword} course`,
          engine: "google",
          api_key: process.env.SERP_API_KEY,
        },
      });

      const results =
        response.data.organic_results?.map((item) => {
          const link = item.link;

          let platform = "Website";
          if (link.includes("udemy")) platform = "Udemy";
          else if (link.includes("coursera")) platform = "Coursera";
          else if (link.includes("edx")) platform = "edX";
          else if (link.includes("pluralsight")) platform = "Pluralsight";

          const difficulty = detectDifficulty(item.title + " " + item.snippet);

          return {
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            platform,
            difficulty,
            type: "web",
          };
        }) || [];

      return res.json(results);
    }

    // 🔴 YOUTUBE VIDEOS
    // 🔴 YOUTUBE VIDEOS
    if (type === "youtube") {
      const response = await axios.get("https://serpapi.com/search.json", {
        params: {
          search_query: `${keyword} course`,
          engine: "youtube",
          api_key: process.env.SERP_API_KEY,
        },
      });

      const results =
        response.data.video_results?.map((video) => {
          const difficulty = detectDifficulty(
            video.title + " " + video.description,
          );

          return {
            title: video.title,
            link: video.link,
            snippet: video.description,
            platform: "YouTube",
            difficulty,
            thumbnail: video.thumbnail?.static || null, // ✅ FIXED
            type: "youtube",
          };
        }) || [];

      return res.json(results);
    }

    res.status(400).json({ message: "Invalid type" });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ message: "Error fetching results" });
  }
};

export const saveCourse = async (req, res) => {
  try {
    const {
      title,
      link,
      snippet,
      platform,
      difficulty,
      thumbnail,
      type,
    } = req.body;

    const course = await Course.create({
      user: req.user.id,
      title,
      link,
      snippet,
      platform,
      difficulty,
      thumbnail,
      type,
    });

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Error saving course" });
  }
};


export const getSavedCourses = async (req, res) => {
  try {
    const courses = await Course.find({ user: req.user.id });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching saved courses" });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    await Course.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });

    res.json({ message: "Course removed" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting course" });
  }
};
