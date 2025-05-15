import Profile from "../models/ProfileModel.js";

export const getLatestProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// controllers/profileController.js
export const createOrUpdateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId; // ✅ fallback support

    if (!userId) return res.status(401).json({ message: "Missing user ID" });

    const existing = await Profile.findOne({ userId });
    if (existing) {
      const updated = await Profile.findOneAndUpdate(
        { userId },
        { $set: req.body },
        { new: true }
      );
      return res.json({ message: "Profile updated", output: updated });
    } else {
      const newProfile = new Profile({ ...req.body, userId });
      await newProfile.save();
      return res.json({ message: "Profile created", output: newProfile });
    }
  } catch (err) {
    console.error("❌ Backend error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export default Profile;
