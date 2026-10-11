import mongoose from "mongoose";
const schema = new mongoose.Schema({ query: { type: String, unique: true }, results: { type: [mongoose.Schema.Types.Mixed], default: [] }, expiresAt: Date }, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("CourseSearchCache", schema);
