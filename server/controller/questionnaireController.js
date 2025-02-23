import Questionnaire from "../models/questionnaireModel.js";

// Submit a new questionnaire response associated with the logged-in user
export const submitQuestionnaire = async (req, res) => {
  try {
    const userId = req.user._id;

    const questionnaire = new Questionnaire({
      ...req.body,
      userId,
    });

    await questionnaire.save();

    res.status(201).json({
      message: "Questionnaire submitted successfully.",
      data: questionnaire,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error submitting questionnaire.",
      error,
    });
  }
};

// Get questionnaires submitted by the logged-in user
export const getUserQuestionnaires = async (req, res) => {
  try {
    const userId = req.user._id;

    const questionnaires = await Questionnaire.find({ userId });

    res.status(200).json(questionnaires);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving questionnaires.",
      error,
    });
  }
};
