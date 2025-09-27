import React from 'react'
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const Login = () => {

    const {setShowLogin, axios, setToken, navigate, authView, setAuthView} = useAppContext()

    const [state, setState] = React.useState(authView || "login");
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");

    // Validation state
    const [errors, setErrors] = React.useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [touched, setTouched] = React.useState({ name: false, email: false, password: false, confirmPassword: false });
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Simple validators
    const validateName = (val) => {
        if (!val.trim()) return 'Name is required';
        if (val.trim().length < 2) return 'Name must be at least 2 characters';
        if (val.trim().length > 50) return 'Name must be less than 50 characters';
        return '';
    };

    const validateEmail = (val) => {
        if (!val.trim()) return 'Email is required';
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(val)) return 'Enter a valid email address';
        return '';
    };

    const validatePassword = (val) => {
        if (!val) return 'Password is required';
        if (state === 'login') {
            if (val.length < 6) return 'Password must be at least 6 characters';
            return '';
        }
        // register requirements
        if (val.length < 8) return 'Password must be at least 8 characters';
        if (!/[a-z]/.test(val)) return 'Include at least one lowercase letter';
        if (!/[A-Z]/.test(val)) return 'Include at least one uppercase letter';
        if (!/[0-9]/.test(val)) return 'Include at least one number';
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(val)) return 'Include at least one special character';
        return '';
    };

    const validateConfirmPassword = (val, pwd) => {
        if (state !== 'register') return '';
        if (!val) return 'Confirm your password';
        if (val !== pwd) return 'Passwords do not match';
        return '';
    };

    const runValidation = React.useCallback((fields) => {
        setErrors((prev) => {
            const next = { ...prev };
            if (fields.includes('name')) next.name = state === 'register' ? validateName(name) : '';
            if (fields.includes('email')) next.email = validateEmail(email);
            if (fields.includes('password')) next.password = validatePassword(password);
            if (fields.includes('confirmPassword')) next.confirmPassword = validateConfirmPassword(confirmPassword, password);
            return next;
        });
    }, [state, name, email, password, confirmPassword]);

    // Revalidate when inputs change
    React.useEffect(() => {
        runValidation(['name', 'email', 'password', 'confirmPassword']);
    }, [name, email, password, confirmPassword, state, runValidation]);

    // Reset fields when switching between login/register
    React.useEffect(() => {
        setState(authView || 'login');
    }, [authView]);

    React.useEffect(() => {
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setErrors({ name: '', email: '', password: '', confirmPassword: '' });
        setTouched({ name: false, email: false, password: false, confirmPassword: false });
    }, [state]);

    const onSubmitHandler = async (event) => {
        try {
            event.preventDefault();
            // Validate before submit
            runValidation(['name', 'email', 'password', 'confirmPassword']);
            const isLogin = state === 'login';
            const hasErrors = Object.values({
                name: isLogin ? '' : validateName(name),
                email: validateEmail(email),
                password: validatePassword(password),
                confirmPassword: isLogin ? '' : validateConfirmPassword(confirmPassword, password)
            }).some((msg) => msg);

            if (hasErrors) {
                setTouched({ name: true, email: true, password: true, confirmPassword: true });
                toast.error('Please fix the errors before continuing');
                return;
            }

            setIsSubmitting(true);
            const {data} = await axios.post(`/api/user/${state}`, {name, email, password})

            if(data.success){
                navigate('/')
                setToken(data.token)
                localStorage.setItem('token', data.token)
                setShowLogin(false)
                setTimeout(() => {
                  window.location.reload();
                }, 200);
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div onClick={() => setShowLogin(false)} className='fixed top-0 bottom-0 left-0 right-0 z-50 flex items-center text-sm text-gray-500 bg-black/50'>
            <form onSubmit={onSubmitHandler} onClick={(e) => e.stopPropagation()} className="flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-[380px] rounded-lg shadow-xl border border-borderColor bg-light">
                <p className="text-2xl font-medium m-auto">
                    <span className="text-primary">User</span> {state === "login" ? "Login" : "Sign Up"}
                </p>
                {state === "register" && (
                    <div className="w-full">
                        <p className="text-primary-dull">Name</p>
                        <input
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                            value={name}
                            placeholder="type here"
                            className={`border rounded w-full p-2 mt-1 outline-primary ${touched.name && errors.name ? 'border-red-500 focus:outline-red-500' : 'border-borderColor'}`}
                            type="text"
                            aria-invalid={!!(touched.name && errors.name)}
                            aria-describedby="name-error"
                        />
                        {touched.name && errors.name && (
                            <p id="name-error" className="text-red-500 text-xs mt-1">{errors.name}</p>
                        )}
                    </div>
                )}
                <div className="w-full ">
                    <p className="text-primary-dull">Email</p>
                    <input
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                        value={email}
                        placeholder="type here"
                        className={`border rounded w-full p-2 mt-1 outline-primary ${touched.email && errors.email ? 'border-red-500 focus:outline-red-500' : 'border-borderColor'}`}
                        type="email"
                        aria-invalid={!!(touched.email && errors.email)}
                        aria-describedby="email-error"
                    />
                    {touched.email && errors.email && (
                        <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>
                    )}
                </div>
                <div className="w-full ">
                    <p className="text-primary-dull">Password</p>
                    <input
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                        value={password}
                        placeholder="type here"
                        className={`border rounded w-full p-2 mt-1 outline-primary ${touched.password && errors.password ? 'border-red-500 focus:outline-red-500' : 'border-borderColor'}`}
                        type="password"
                        aria-invalid={!!(touched.password && errors.password)}
                        aria-describedby="password-error"
                    />
                    {touched.password && errors.password && (
                        <p id="password-error" className="text-red-500 text-xs mt-1">{errors.password}</p>
                    )}
                    {state === 'register' && !errors.password && password && (
                        <p className="text-green-600 text-xs mt-1">Password looks good</p>
                    )}
                </div>
                {state === 'register' && (
                    <div className="w-full ">
                        <p className="text-primary-dull">Confirm Password</p>
                        <input
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                            value={confirmPassword}
                            placeholder="type here"
                            className={`border rounded w-full p-2 mt-1 outline-primary ${touched.confirmPassword && errors.confirmPassword ? 'border-red-500 focus:outline-red-500' : 'border-borderColor'}`}
                            type="password"
                            aria-invalid={!!(touched.confirmPassword && errors.confirmPassword)}
                            aria-describedby="confirm-password-error"
                        />
                        {touched.confirmPassword && errors.confirmPassword && (
                            <p id="confirm-password-error" className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                        )}
                    </div>
                )}
                {state === "register" ? (
                    <p className="text-primary-dull">
                        Already have account? <span onClick={() => { setState("login"); setAuthView('login'); }} className="text-primary cursor-pointer">click here</span>
                    </p>
                ) : (
                    <p className="text-primary-dull">
                        Create an account? <span onClick={() => { setState("register"); setAuthView('register'); }} className="text-primary cursor-pointer">click here</span>
                    </p>
                )}
                <button
                    disabled={
                        state === 'login'
                            ? !!(validateEmail(email) || validatePassword(password)) || isSubmitting
                            : !!(validateName(name) || validateEmail(email) || validatePassword(password) || validateConfirmPassword(confirmPassword, password)) || isSubmitting
                    }
                    className={`w-full py-2 rounded-md text-white transition-all ${
                        (state === 'login'
                            ? !!(validateEmail(email) || validatePassword(password))
                            : !!(validateName(name) || validateEmail(email) || validatePassword(password) || validateConfirmPassword(confirmPassword, password))) || isSubmitting
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-primary hover:bg-primary-dull cursor-pointer'
                    }`}
                >
                    {state === "register" ? "Create Account" : "Login"}
                </button>
            </form>
        </div>
    )
}

export default Login