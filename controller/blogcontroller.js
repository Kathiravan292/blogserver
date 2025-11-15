import mongoose from "mongoose";
import Blog from "../model/blogmodel.js";
import User from "../model/usersmodels.js";




export const creatingblog = async (req, res, next) => {
  const { title, topic, content,image } = req.body;
   const userId = req.userId
  const user = await User.findById(userId)

  try {
   
    const blog = new Blog({
      title,
      topic,
      content,
      image,
      user:{
        id:userId,name:user.userName
      }
    });

    await blog.save();

    return res
      .status(200)
      .json({ message: "Blog Created Successfully!", success: true });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};
export const getAllBlogs = async(req, res, next) => {
    try{
        const blogs = await Blog.find()
        return res.status(200).json({message:"blogs get successfully", blogs, success:true})
    }catch(err){
        return res.status(500).json({message:"Internal Server Error", success:false})
    }
}
export const editblog =async(req,res,next)=>{
    const blogId = req.params.id
     try{
        let blog = await Blog.findById(blogId)    
        if(!blog){
            return res.status(400).json({message:"Invalid ID", success:false})
        }
        const updatedBlog = await Blog.findByIdAndUpdate(blogId, {$set: req.body}, {new:true})
        return res.status(200).json({message:"Blog Edited Successfully", data:updatedBlog, success:true})
    }catch(err){
        return res.status(500).json({message:"Internal Server Error", success:false})
    }


}
export const getSingleBlog = async(req, res, next) => {
    const blogId = req.params.id
    try{
        const blog = await Blog.findById(blogId)
        if(!mongoose.Types.ObjectId.isValid(blogId)){
             return res.status(400).json({message:"Blog not found", success:false})
        }
        return res.status(200).json({message:"Single blog success", data:blog, success:true})
    }catch(err){
        return res.status(500).json({message:"Internal Server Error", success:false})
    }
}
export const getBlogByTopic = async(req, res, next) => {
    const topic = req.params.topic

    try{
        const blog = await Blog.find({topic:topic})
        console.log(blog);
        
            if(blog.length == 0){
            return res.status(400).json({message:"Blog not found", success:false})
        }
        return res.status(200).json({message:"Single blog success", data:blog, success:true})

    }catch(err){
        return res.status(500).json({message:"Internal Server Error", success:false})
    }
}
export const deleteBlog = async(req, res, next) => {
    const blogId = req.params.id

    try{
        const blog = await Blog.findById(blogId)
        if(!mongoose.Types.ObjectId.isValid(blogId)){
             return res.status(400).json({message:"Blog not found", success:false})
        }
        const deletedBlog = await Blog.findByIdAndDelete({_id:blogId})

        return res.status(200).json({message:"Blog deleted Successfully", success:true})
    }catch(err){
        return res.status(500).json({message:"Internal Server Error", success:false})
    }
}