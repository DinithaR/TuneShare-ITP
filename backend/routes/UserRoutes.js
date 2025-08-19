


import express from "express";
import { getInstruments, getUserData, loginUser, registerUser, becomeOwner, getAllUsers, changeUserRole, deleteUser, editUser, adminGetAllInstruments, adminDeleteInstrument, adminEditInstrument } from "../controllers/UserController.js";
import { protect, isAdmin } from "../middleware/auth.js";

const userRouter = express.Router();

// Admin instrument management
userRouter.get('/admin/instruments', protect, isAdmin, adminGetAllInstruments);
userRouter.delete('/admin/instruments/:instrumentId', protect, isAdmin, adminDeleteInstrument);
userRouter.put('/admin/instruments/edit', protect, isAdmin, adminEditInstrument);

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.get('/data', protect, getUserData);
userRouter.get('/instruments', getInstruments);
userRouter.post('/become-owner', protect, becomeOwner);

// Admin user management
userRouter.get('/all', protect, isAdmin, getAllUsers);
userRouter.post('/change-role', protect, isAdmin, changeUserRole);
userRouter.delete('/delete/:userId', protect, isAdmin, deleteUser);
userRouter.put('/edit', protect, editUser);

export default userRouter;
