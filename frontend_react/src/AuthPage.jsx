import React, { useState } from 'react';

export default function AuthPage({ onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' }); // type: 'error' or 'success'

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        // Determine which API to hit based on the toggle state
        const url = isLogin 
            ? 'http://127.0.0.1:8000/api/token/' 
            : 'http://127.0.0.1:8000/api/register/';
            
        const payload = isLogin 
            ? { username, password } 
            : { username, email, password };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                // Catch Django's specific error messages
                const errorText = data.detail || data.username?.[0] || 'Authentication failed. Please try again.';
                throw new Error(errorText);
            }

            if (isLogin) {
                // Save the secure tokens to the browser's local storage
                localStorage.setItem('accessToken', data.access);
                localStorage.setItem('refreshToken', data.refresh);
                // Tell the main App that we are in!
                onLoginSuccess();
            } else {
                // Registration was successful! Flip them over to the Login screen
                setIsLogin(true);
                setMessage({ type: 'success', text: 'Account created successfully! Please log in.' });
                setPassword(''); // Clear password for security
            }

        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-2 text-slate-900 mb-4">
                        <span className="text-3xl">👕</span>
                        <h2 className="text-2xl font-bold">FashionAI</h2>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900">
                        {isLogin ? 'Welcome back' : 'Create an account'}
                    </h2>
                </div>

                {/* Message Banner */}
                {message.text && (
                    <div className={`mb-4 p-3 rounded text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-400' : 'bg-green-100 text-green-700 border border-green-400'}`}>
                        {message.text}
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Username</label>
                            <input 
                                type="text" 
                                required 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Email address</label>
                                <input 
                                    type="email" 
                                    required={!isLogin} 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Password</label>
                            <input 
                                type="password" 
                                required 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                {/* Toggle Button */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-600">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button 
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setMessage({ type: '', text: '' }); // Clear errors when flipping
                            }}
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            {isLogin ? 'Sign up' : 'Log in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}