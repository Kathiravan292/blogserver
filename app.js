const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json()); // built-in JSON parser

// Connect to MongoDB
const uri = "mongodb+srv://kkathiravan785_db_user:product@product.6cydibf.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

// Create a Mongoose schema
const userSchema = new mongoose.Schema({
  name: String,
  age: Number,
});

// Create a Mongoose model
const User = mongoose.model('User', userSchema);

// API endpoint to store data
app.post('/adduser', async (req, res) => {
  try {
    const newUser = new User(req.body); // req.body contains JSON data
    await newUser.save();
    res.status(201).send("User added successfully");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
