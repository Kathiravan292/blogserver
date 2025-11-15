import express from "express"
import { creatingblog, deleteBlog, editblog, getAllBlogs, getBlogByTopic, getSingleBlog } from "../controller/blogcontroller.js"
import { authentication,restrict } from "../auth/verifiy.js"


const route = express.Router()
route.post("/create", authentication, restrict(["user"]),creatingblog)
route.get("/getallblog",getAllBlogs)
route.put("/editblog/:id",authentication, restrict(["user"]),editblog)
route.get("/getsingleblog/:id",getSingleBlog)
route.get("/getblogbytopic/:topic",getBlogByTopic)
route.delete("/deleteblog/:id",authentication, restrict(["user"]),deleteBlog)

export default route;