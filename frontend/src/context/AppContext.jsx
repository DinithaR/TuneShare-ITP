

import { useContext, useEffect, useState } from "react";
import { createContext } from "react";
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from "react-router-dom";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const navigate = useNavigate();
    const currency = import.meta.env.VITE_CURRENCY;

    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('user');
    const [isOwner, setIsOwner] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [pickupDate, setPickupDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [instruments, setInstruments] = useState([]);
    const [authLoading, setAuthLoading] = useState(true);

    // Login
    const login = async (email, password) => {
        try {
            setAuthLoading(true);
            const { data } = await axios.post('/api/user/login', { email, password });
            if (data.success) {
                setToken(data.token);
                setRole(data.role);
                localStorage.setItem('token', data.token);
                axios.defaults.headers.common['Authorization'] = data.token;
                await fetchUser();
                                setShowLogin(false);
                                toast.success('Login successful');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setAuthLoading(false);
        }
    };

    // Register
    const register = async (name, email, password) => {
        try {
            setAuthLoading(true);
            const { data } = await axios.post('/api/user/register', { name, email, password });
            if (data.success) {
                setToken(data.token);
                setRole(data.role);
                localStorage.setItem('token', data.token);
                axios.defaults.headers.common['Authorization'] = data.token;
                await fetchUser();
                                setShowLogin(false);
                                toast.success('Registration successful');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setAuthLoading(false);
        }
    };

    // Promote user to owner
    const becomeOwner = async () => {
        try {
            const { data } = await axios.post('/api/user/become-owner');
            if (data.success) {
                // Only set role to 'owner' if current role is 'user'.
                setUser(data.user);
                if (role === 'user') {
                    setRole('owner');
                }
                setIsOwner(true);
                toast.success('You are now an owner!');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Failed to become owner');
        }
    };

    // Fetch user data
    const fetchUser = async () => {
        try {
            const { data } = await axios.get('/api/user/data');
            if (data.success) {
                setUser(data.user);
                setRole(data.user.role);
                setIsOwner(data.user.role === 'owner' || data.user.role === 'admin');
            } else {
                setUser(null);
                setRole('user');
                setIsOwner(false);
                navigate('/');
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setAuthLoading(false);
        }
    };

    // Fetch all instruments
    const fetchInstruments = async () => {
        try {
            const { data } = await axios.get('/api/user/instruments');
            data.success ? setInstruments(data.instruments) : toast.error(data.message);
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Logout
    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setRole('user');
        setIsOwner(false);
        axios.defaults.headers.common['Authorization'] = '';
        toast.success('You have been logged out');
        navigate('/');
    };

    // On mount, get token and fetch instruments
    useEffect(() => {
        const token = localStorage.getItem('token');
        setToken(token);
        if (token) {
            axios.defaults.headers.common['Authorization'] = token;
            fetchUser();
        } else {
            setAuthLoading(false);
        }
        fetchInstruments();
    }, []);

    const value = {
    navigate, currency, axios, user, setUser, token, setToken, role, setRole, isOwner, setIsOwner,
    showLogin, setShowLogin, logout, fetchUser, fetchInstruments, instruments, setInstruments,
    pickupDate, setPickupDate, returnDate, setReturnDate, login, register, becomeOwner, authLoading
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    return useContext(AppContext);
};
