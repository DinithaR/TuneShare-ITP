import React from 'react'
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const Login = () => {

    const {setShowLogin, axios, setToken, navigate} = useAppContext()

    const [state, setState] = React.useState("login");
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");

    const onSubmitHandler = async (event) => {
        try {
            event.preventDefault();
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
        }
    }

    return (
        <div onClick={() => setShowLogin(false)} className='fixed top-0 bottom-0 left-0 right-0 z-50 flex items-center text-sm text-gray-500 bg-black/50'>
            <form onSubmit={onSubmitHandler} onClick={(e) => e.stopPropagation()} className="flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-[352px] rounded-lg shadow-xl border border-borderColor bg-light">
                <p className="text-2xl font-medium m-auto">
                    <span className="text-primary">User</span> {state === "login" ? "Login" : "Sign Up"}
                </p>
                {state === "register" && (
                    <div className="w-full">
                        <p className="text-primary-dull">Name</p>
                        <input onChange={(e) => setName(e.target.value)} value={name} placeholder="type here" className="border border-borderColor rounded w-full p-2 mt-1 outline-primary" type="text" required />
                    </div>
                )}
                <div className="w-full ">
                    <p className="text-primary-dull">Email</p>
                    <input onChange={(e) => setEmail(e.target.value)} value={email} placeholder="type here" className="border border-borderColor rounded w-full p-2 mt-1 outline-primary" type="email" required />
                </div>
                <div className="w-full ">
                    <p className="text-primary-dull">Password</p>
                    <input onChange={(e) => setPassword(e.target.value)} value={password} placeholder="type here" className="border border-borderColor rounded w-full p-2 mt-1 outline-primary" type="password" required />
                </div>
                {state === "register" ? (
                    <p className="text-primary-dull">
                        Already have account? <span onClick={() => setState("login")} className="text-primary cursor-pointer">click here</span>
                    </p>
                ) : (
                    <p className="text-primary-dull">
                        Create an account? <span onClick={() => setState("register")} className="text-primary cursor-pointer">click here</span>
                    </p>
                )}
                <button className="bg-primary hover:bg-primary-dull transition-all text-white w-full py-2 rounded-md cursor-pointer">
                    {state === "register" ? "Create Account" : "Login"}
                </button>
            </form>
        </div>
    )
}

export default Login