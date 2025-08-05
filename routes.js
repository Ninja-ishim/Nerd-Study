// routes/guides.js
const express = require('express');
const jwt = require('jsonwebtoken');
const Guide = require('../models/Guide');
const User = require('../models/User');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
}

// Upload guide (Protected)
router.post('/upload', verifyToken, async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const file = req.files.file;
  const { title, category } = req.body;
  const filename = `${Date.now()}_${file.name}`;

  try {
    const uploadPath = path.join(__dirname, '..', 'uploads', filename);
    file.mv(uploadPath, async (err) => {
      if (err) return res.status(500).json({ message: 'Upload failed' });

      const newGuide = new Guide({
        title,
        filename,
        category,
        uploadedBy: req.userId,
      });

      await newGuide.save();
      res.status(201).json({ message: 'Guide uploaded. Pending approval.' });
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get approved guides
router.get('/', async (req, res) => {
  try {
    const guides = await Guide.find();
    res.status(200).json(guides);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin approves a guide
router.patch('/:id/approve', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin) return res.status(403).json({ message: 'Unauthorized' });

    await Guide.findByIdAndUpdate(req.params.id, { approved: true });
    res.status(200).json({ message: 'Guide approved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;