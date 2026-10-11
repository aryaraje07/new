import axios from "axios";
import CourseSearchCache from "../models/CourseSearchCache.js";

const catalogue = [
  ["Survey Design Fundamentals", "Survey Design", "NSSTA/MoSPI catalogue", "https://mospi.gov.in/search?search_api_fulltext=survey%20design"],
  ["Sampling Methods for Official Statistics", "Sampling", "NSSTA/MoSPI catalogue", "https://mospi.gov.in/search?search_api_fulltext=sampling%20official%20statistics"],
  ["Python for Statistical Analysis", "Python", "NPTEL/SWAYAM catalogue", "https://swayam.gov.in/explorer"],
  ["SQL for Government Data", "SQL", "Prototype learning catalogue", "https://www.igotkarmayogi.gov.in"],
  ["Data Quality in Official Statistics", "Data Quality", "NSSTA/MoSPI catalogue", "https://mospi.gov.in/search?search_api_fulltext=data%20quality%20official%20statistics"],
  ["Privacy and Secure Data Exchange", "Data Privacy", "Prototype learning catalogue", "https://www.igotkarmayogi.gov.in"],
];

const isBareDomain = (value) => {
  try {
    const url = new URL(value);
    return ["mospi.gov.in", "www.mospi.gov.in", "swayam.gov.in", "www.swayam.gov.in"].includes(url.hostname) && !url.search && url.pathname === "/";
  } catch {
    return false;
  }
};

const resolveResourceUrl = (url, title, competency) => {
  if (String(url || "").includes("swayam.gov.in/search")) return "https://swayam.gov.in/explorer";
  if (!isBareDomain(url)) return url;
  const query = encodeURIComponent(`${title} ${competency}`.trim());
  if (url.includes("mospi.gov.in")) return `https://mospi.gov.in/search?search_api_fulltext=${query}`;
  if (url.includes("swayam.gov.in")) return "https://swayam.gov.in/explorer";
  return url;
};

export const normalizeResourceUrl = resolveResourceUrl;

const normalizeResults = (results) => results.map((item) => ({
  ...item,
  url: resolveResourceUrl(item.url, item.title, item.competency),
}));

export const discoverCourses = async ({ competency, role, gap = 1 }) => {
  const query = `${competency} ${role || "official statistics"} training India`.toLowerCase();
  const cached = await CourseSearchCache.findOne({ query, expiresAt: { $gt: new Date() } }).lean();
  if (cached) {
    const results = normalizeResults(cached.results || []);
    if (JSON.stringify(results) !== JSON.stringify(cached.results || [])) {
      await CourseSearchCache.updateOne({ _id: cached._id }, { $set: { results } });
    }
    return { source: "cache", results };
  }
  let results = [];
  if (process.env.COURSE_SEARCH_ENABLED === "true" && process.env.SERPAPI_KEY) {
    try {
      const response = await axios.get("https://serpapi.com/search.json", { params: { q: query, engine: "google", api_key: process.env.SERPAPI_KEY }, timeout: 8000 });
      results = (response.data.organic_results || []).slice(0, 6).map((item) => ({ title: item.title, url: item.link, platform: /igot/i.test(`${item.title} ${item.link}`) ? "iGOT" : /nssta|mospi/i.test(`${item.title} ${item.link}`) ? "NSSTA/MoSPI" : "External learning resource", competency, relevanceReason: `Recommended for a Level ${gap} ${competency} gap.` }));
    } catch { /* the local catalogue below is the explicit failure-safe fallback */ }
  }
  if (!results.length) results = catalogue.filter(([title, topic]) => `${title} ${topic}`.toLowerCase().includes(String(competency).toLowerCase()) || String(competency).toLowerCase().includes(topic.toLowerCase())).map(([title, _topic, platform, url]) => ({ title, url, platform, competency, relevanceReason: `Recommended for a Level ${gap} ${competency} gap.`, prototype: true }));
  if (!results.length) results = catalogue.slice(0, 3).map(([title, _topic, platform, url]) => ({ title, url, platform, competency, relevanceReason: `Foundational resource while addressing your ${competency} gap.`, prototype: true }));
  results = normalizeResults(results);
  await CourseSearchCache.findOneAndUpdate({ query }, { query, results, expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) }, { upsert: true });
  return { source: results[0]?.prototype ? "prototype catalogue" : "SerpAPI", results };
};
