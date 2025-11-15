import mongoose from "mongoose";
import bcrypt from "bcrypt";
import user from "../model/usersmodels.js"

export const edituser =async(req,res,next)=>{
    const userId =req.params.id
    console.log(userId);
    

    try{
        const{userName, email, password, phoneNumber, profilePic}=req.body;
        let users = await user.findById(userId);
        
        
          if(!users){
        return res.status(400).json({message:"User Not Found!", success:false})
      }
      const salt= await bcrypt.genSalt(10)

      const hashpassword = await bcrypt.hash(password,salt)

      const data ={userName, email, hashpassword, phoneNumber, profilePic}

      const updatauser =await user.findByIdAndUpdate(userId, {$set: data}, {new:true})

      const {password:newPassword, ...rest}= updatauser._doc

      return res.status(200).json({message:"User Updated Successfully", success:true , userDetails:{...rest}})

    }catch(err){
      return res.status(500).json({message:"Internal Server Errorrr", success:false})
    }

      

    }

export const deleteUser = async(req, res, next) => {
  const userId = req.params.id
  console.log(userId);
  try{
    if(!mongoose.Types.ObjectId.isValid(userId)){
      return res.status(400).json({message:"Invalid ID", success:false})
    }
    await user.findByIdAndDelete(userId)
    return res.status(200).json({message:"User deleted Successfully", success:true})
  }catch(err){
    return res.status(500).json({message:"Internal Server Error..", success:false})
  }
}



export const getProfile = async (req, res) => {
  const userId = req.userId;

  try {
    // 1. Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID"
      });
    }

    // 2. Find logged-in user
    const User = await user.findById(userId).select("-password");

    // 3. Check if user exists
    if (!User) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 4. Return profile
    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      profileDetails: User
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await user.find();

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error ",
      error: err.message
    });
  }
};

