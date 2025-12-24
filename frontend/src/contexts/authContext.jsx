import { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); 
    const [encKey, setEncKey] = useState(null); 
    const [token, setToken] = useState(localStorage.getItem('token'));

    const loginSuccess = (userData, token, key) => {
        setUser(userData);
        setToken(token);
        setEncKey(key); 
        localStorage.setItem('token', token); 
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        setEncKey(null); 
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, token, encKey, loginSuccess, logout }}>
            {children}
        </AuthContext.Provider>
    );
};