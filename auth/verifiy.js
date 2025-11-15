import user from "../model/usersmodels.js";
import jwt from "jsonwebtoken";

export const authentication = async(req ,res ,next)=>{
    const authToken = req.headers.authorization

    if(!authToken || !authToken.startsWith("Bearer")){
      return res.status(401).json({message:"Authentication Failed", success:false})
    }

    try{

      const token = authToken.split(" ")[1] 
      const dedcoded = jwt.verify(token, process.env.JWT_SECURE_CODE)
      req.userId = dedcoded.id  
      next()
    }catch(err){
      return res.status(500).json({message:"Internal Server Error!!!", success: false})
    }
    
}

export const restrict = (roles) => async (req, res, next) => {
  try {
    const userId = req.userId;

    const User = await user.findById(userId);

    if (!User) {
      return res.status(404).json({
        success: false,
        message: "User not found!"
      });
    }

    const userRole = User.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this route"
      });
    }

    next();

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error ggg",
      error: err.message
    });
  }
};



