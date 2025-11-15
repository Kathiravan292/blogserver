import userschema from "../model/usersmodels.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const generateToken = (user) => {
  return jwt.sign({ id: user._id, userName: user.userName },process.env.JWT_SECURE_CODE,{ expiresIn: "9d" } );
};

export const register = async (req, res, next) => {
  const { email, userName, phoneNumber, profilepic, role, password } = req.body;
  try {
    const user = await userschema.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists!", status: false });
    }

    const salt = await bcrypt.genSalt(10);
    const hashpassword = await bcrypt.hash(password, salt);

    const newuser = new userschema({
      email,
      userName,
      password: hashpassword,
      phoneNumber,
      profilepic,
      role,
    });

    await newuser.save();
    return res.status(200).json({ message: "User added successfully", status: true });
  } catch (err) {
    console.log("❌ Error details:", err);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await userschema.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found!", success: false });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(404).json({ message: "Invalid password", success: false });
    }

    const token = generateToken(user);
    console.log("✅ Generated token:", token);

    const { password: _, role, ...rest } = user._doc;
    res.status(200).json({ message: "User logged in successfully",   success: true, data: { ...rest, token, role },  });
    
  } catch (err) {
    console.log("❌ Error details:", err);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};
