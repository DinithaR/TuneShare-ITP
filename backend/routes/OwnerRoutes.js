import express from "express";
import { protect } from "../middleware/auth.js";
import { addInstrument, changeRoleToOwner, deleteInstrument, getDashboardData, getOwnerInstruments, toggleInstrumentAvailability, updateInstrument, updateUserImage } from "../controllers/OwnerController.js";
import upload from "../middleware/multer.js";


const ownerRouter = express.Router();


ownerRouter.post("/change-role", protect, changeRoleToOwner)
// Accept up to 5 images with field name 'images'
ownerRouter.post("/add-instrument", upload.array("images", 5), protect, addInstrument)
ownerRouter.post("/update-instrument", upload.array("images", 5), protect, updateInstrument)
ownerRouter.get('/instruments', protect, getOwnerInstruments)
ownerRouter.post('/toggle-instrument', protect, toggleInstrumentAvailability)
ownerRouter.post('/delete-instrument', protect, deleteInstrument)


ownerRouter.get('/dashboard', protect, getDashboardData) 
ownerRouter.post('/update-image', upload.single("image"), protect, updateUserImage)


export default ownerRouter;