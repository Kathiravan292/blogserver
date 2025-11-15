import express from "express"
import { authentication, restrict } from "../auth/verifiy.js"
import { deleteUser, edituser, getAllUsers, getProfile } from "../controller/usercontroller.js"

const route = express.Router()
route.put("/edituser/:id",authentication, restrict(["user"]),edituser)
route.delete("/deleteuser/:id",authentication, restrict(["admin"]), deleteUser)
route.get("/getallusers", authentication, restrict(["admin"]), getAllUsers)
route.get("/me", authentication, restrict(["user"]), getProfile)

export default route