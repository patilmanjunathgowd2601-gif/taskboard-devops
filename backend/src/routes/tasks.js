const express = require("express");
const Task = require("../models/Task");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "title is required" });
    }
    const task = await Task.create({ title: title.trim(), description });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
